
import express from 'express';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Middleware to verify JWT
function verifyToken(req, res, next) {
  const authHeader = req.header('Authorization');
  const url = req.header('Instance')+"/s/-/dw/bm/v1/site_aliases?display_locale=default";

  if (!authHeader) {
  return res.status(403).send('A token is required for authentication');
  }

  const token = authHeader.split(' ')[1]; // Extract the token part

  try {
    const decoded = jwt.decode(token, { complete: true });
    const realmID = decoded.payload.tnt.split('_')[0];
    req.realmID = realmID;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    fetch(url, options)
      .then(response => {
        if (response.status == 200) {
          return response.json();
        } else {
          throw new Error('Invalid Token');
        }
      })
      .then(json => {
        next();
      })
      .catch(err => {
        res.status(401).send('Invalid Token: ' + err.message);
      });

  } catch (err) {
    res.status(401).send('Invalid Token: ' + err.message);
  }
}

// Route that requires JWT verification
app.get('/fetchZones', verifyToken, (req, res) => {
  fetchZones(req.realmID)
    .then(result => {
      res.json(result);
    })
    .catch(error => {
      res.status(500).send('Error fetching zones: ' + error.message);
    });
});


async function fetchZones(realmId) {
  const url = process.env.ZONES;
  const token = process.env.TOKEN;
  let result;
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error(`An error occurred with status code ${response.status}`);
      }
    })
    .then(data => {
      const result = data.result.map(item => ({
        id: item.id,
        name: item.name
      }));
      return result;
    })
    .catch(e => {
      console.error('Error fetching data:', e.message);
      result = `Error fetching data: ${e.message}`;
      return result;
    });
}
//Route to fetch traffic information

app.post('/analytics', verifyToken, async (req, res) => {
  try {
    const result = await getAnalytics(req);
    res.json(result);
  } catch (error) {
    console.log('Error in /analytics:', error.message);
    res.status(500).send('Error getting analytics: ' + error.message);
  }
});

async function getAnalytics(req) {
  const url = process.env.GRAPHQL;
  const token = process.env.TOKEN;

  if (!req.body || !req.body.payload) {
    console.log('Invalid payload structure');
    throw new Error('Invalid payload structure');
  }

  const { zoneName, fromDateTime, toDateTime, limit } = req.body.payload;

  const graphqlQuery = JSON.stringify({
    query: `
    {
        viewer {
            zones(filter: {zoneTag: "${zoneName}"}) {
                topReferers: httpRequestsAdaptiveGroups(filter: {datetime_geq: "${fromDateTime}", datetime_leq: "${toDateTime}"}, limit: ${limit}, orderBy:[count_DESC]) {
                    count
                    dimensions {
                        metric: clientRefererHost
                    }
                }
                topPaths: httpRequestsAdaptiveGroups(filter: {datetime_geq: "${fromDateTime}", datetime_leq: "${toDateTime}"}, limit: ${limit}, orderBy:[count_DESC]) {
                    count
                    dimensions {
                        metric: clientRequestPath
                    }
                }
                topASNs: httpRequestsAdaptiveGroups(filter: {datetime_geq: "${fromDateTime}", datetime_leq: "${toDateTime}"}, limit: ${limit}, orderBy:[count_DESC]) {
                    count
                    dimensions {
                        metric: clientAsn
                        description: clientASNDescription
                    }
                }
                topUserAgents: httpRequestsAdaptiveGroups(filter: {datetime_geq: "${fromDateTime}", datetime_leq: "${toDateTime}"}, limit: ${limit}, orderBy:[count_DESC]) {
                    count
                    dimensions {
                        metric: userAgent
                    }
                }
                countries: httpRequestsAdaptiveGroups(filter: {datetime_geq: "${fromDateTime}", datetime_leq: "${toDateTime}"}, limit: ${limit}, orderBy:[count_DESC]) {
                    count
                    dimensions {
                        metric: clientCountryName
                    }
                }
                topClientIPs: httpRequestsAdaptiveGroups(filter: {datetime_geq: "${fromDateTime}", datetime_leq: "${toDateTime}"}, limit: ${limit}, orderBy:[count_DESC]) {
                    count
                    dimensions {
                        metric: clientIP
                    }
                }
            }
        }
    }`
  });
  

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: graphqlQuery
    });

    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`An error occurred with status code ${response.status}`);
    }
  } catch (e) {
    console.error('Error fetching data:', e.message);
    throw new Error(`Error fetching data: ${e.message}`);
  }
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

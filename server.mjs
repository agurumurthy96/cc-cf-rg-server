
import express from 'express';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 3000;

// Middleware to verify JWT
function verifyToken(req, res, next) {
  const authHeader = req.header('Authorization');
  const url = req.header('Instance')+"/s/-/dw/bm/v1/site_aliases?display_locale=default";
  const refe = "https://"+req.header('Host')+"/s/-/dw/bm/v1/site_aliases?display_locale=default";

  if (!authHeader) {
  return res.status(403).send('A token is required for authentication');
  }

  const token = authHeader.split(' ')[1]; // Extract the token part

  try {
    const decoded = jwt.decode(token, { complete: true });
    console.log("Value of token"+token)
    //const url = `https://zzem-079.dx.commercecloud.salesforce.com/s/-/dw/bm/v1/site_aliases?display_locale=default`;
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
  fetchZones(req, res)
    .then(result => {
      res.send(`result!` + result);
    })
});

async function fetchZones(req, res) {
  const url = "https://api.cloudflare.com/client/v4/zones?account.name=aadf";
  const token = "CSzV9tvmsj7K8q5zpsTzhlx5P-Ttm65V5uOaVomP";
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
      return JSON.stringify(result, null, 2);
    })
    .catch(e => {
      console.error('Error fetching data:', e.message);
      result = `Error fetching data: ${e.message}`;
      return result;
    });
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

const express = require('express');
const app = express();
const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');
const path = require('path');


app.use('/data', express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'))
})

const getFormattedDate = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  let year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
};

const fetchCursBnrRo = async (DATE) => {
  const CURS_BNR_RO_DAY_URL = 'https://www.cursbnr.ro/arhiva-curs-bnr-$DATE'
  try {
    const response = await axios.get(CURS_BNR_RO_DAY_URL.replace('$DATE', DATE))
    const $ = cheerio.load(response.data);

    const EURO_ROW = $('table tbody tr td:contains("EUR")');
    console.log(DATE);
    return {
      date: DATE,
      currency: EURO_ROW.text(),
      value: parseFloat(EURO_ROW.next().next().text(), 10)
    }
  }
  catch (err) {
    console.error(`ERROR: An error occurred while trying to fetch: ${err, DATE}`);
  };
};

const scrapeCursBnrRo = async () => {
  const JSON_FILE_NAME = './public/euro_exchange_history_results.json';
  try {
    const jsonData = JSON.parse(fs.readFileSync(JSON_FILE_NAME));

    if (jsonData && Object.keys(jsonData).length) return;
  }
  catch (err) {
    console.error(err);
  }

  const URL_DATE = new Date('2005-01-03');
  const CURRENT_DATE = new Date();
  const results = [];
  const avgResults = {
    labels: [],
    data: [],
    currency: 'EUR'
  };

  while (URL_DATE < CURRENT_DATE) {
    const result = await fetchCursBnrRo(getFormattedDate(URL_DATE));
    results.push(result);
    URL_DATE.setDate(URL_DATE.getDate() + 1);
  }

  let sum = 0;
  let noOfDays = 0;
  let month = '' + (new Date(results[0].date).getMonth() + 1);
  for (let index = 1; index < results.length; index++) {
    const currentMonth = '' + (new Date(results[index].date).getMonth() + 1);
    if (month !== currentMonth) {
      const year = new Date(results[index].date).getFullYear();
      if (month.length < 2) month = '0' + month;
      avgResults.labels.push([year, month].join('-'));
      avgResults.data.push(sum / noOfDays);
      sum = 0;
      noOfDays = 0;
      month = currentMonth
    } else {
      sum += results[index].value;
      noOfDays += 1;
    }
  }

  fs.writeFileSync(JSON_FILE_NAME, JSON.stringify(avgResults));
  console.log('DONE');
};
scrapeCursBnrRo();

const port = 3000
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)

})
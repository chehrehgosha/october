const puppeteer = require("puppeteer");
const express = require("express");

const app = express();
const port = 5000;

app.post("/", express.json(), async (req, res) => {
  // reading different fields from body
  const { name, siret, location } = req.body;

  // url of the source website where we rely on our data:)
  const url = "https://www.pagesjaunes.fr/annuaire/chercherlespros";

  // launching a headless browser
  const browser = await puppeteer.launch({
    // change this option to false to see the browser flow
    headless: true,
    defaultViewport: null,
    args: ["--window-size=1920,1080"],
  });

  // openning a newpage on the browser
  const page = await browser.newPage();

  // going to the source url to perform the search
  await page.goto(url, {
    waitUntil: "networkidle2", // this option means that this page is considered as loaded when there is at most two requests sending periodically
    timeout: 0, // setting timeout to zero will help loading heavy pages
  });

  // evaluating the page: helps to use query selectors
  await page
    .evaluate(async () => {
      // first check if there is a pop-up for the cookies policy
      let cookieNoticeElement = await document.querySelector(
        "#didomi-notice-agree-button"
      );
      if (cookieNoticeElement) {
        await cookieNoticeElement.click();
      }
    })
    .then(async () => {
      // typing the name, siret, location inside the search box
      await page.type("#quoiqui", `${name}`);
      await page.type("#ou", location);
    })
    .then(async () => {
      // looking for the search button and clicking on it
      await page.evaluate(() =>
        document.querySelector('[title="Trouver"]').click()
      );
    })
    .then(async () => {
      // wait for the navigation done by searching
      await page.waitForNavigation();

      // evaluating the new page and looking for listResults <div> and the <ul> inside it
      await page.evaluate(async () => {
        // getting the children of the results div --> meaning the search results

        const resultListChildren = await document.querySelector(
          "#listResults > ul"
        ).children;

        var arrayOfLiElement = [].slice.call(resultListChildren);

        // there are several possibilites in the search results, but basically here we are clicking on the header of the first search result
        if (
          arrayOfLiElement[0].querySelector("div > header > div > div > h3 > a")
        )
          await arrayOfLiElement[0]
            .querySelector("div > header > div > div > h3 > a")
            .click();
      });
    })
    .then(async (error) => {
      // redirecting to the final result page
      await page.waitForNavigation();
      await page
        .evaluate(async () => {
          //looking for the span which holds the phone number
          const telephoneNumber = await document.querySelector(
            "span.coord-numero.noTrad"
          ).innerHTML;
          return telephoneNumber;
        })
        .then((telephoneNumber) => res.send(telephoneNumber));
    })
    .catch((error) => {
      res.send(
        "No telephone number found for this company inside the pagesjaunes.fr"
      );
    });
  browser.close();
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

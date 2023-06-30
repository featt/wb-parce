import express from "express";
import axios from "axios";
import querystring from "querystring";

const app = express();
const port = 3000;

async function main() {
  const articleNumbers = [138593051, 94340317, 94340606, 138590435, 138607462, 94339119, 94339244,];
  try {
    const session = axios.create();

    const address = "Площадь революции, Москва";
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search/${encodedAddress}?format=json`;
    const coordsResponse = await session.get(url);
    const coords = coordsResponse.data;

    if (!coords || coords.length === 0) {
      throw new Error("Failed to retrieve coordinates.");
    }

    const params = {
      latitude: coords[0].lat,
      longitude: coords[0].lon,
      address: "Город чудес",
    };
    
    const geoInfoUrl = "https://user-geo-data.wildberries.ru/get-geo-info";
    const geoInfoParams = querystring.stringify(params);
    const geoInfoResult = await session.get(`${geoInfoUrl}?${geoInfoParams}`);
    const geoInfo = geoInfoResult.data;
    const xinfoParams = querystring.parse(geoInfo.xinfo);

    const cardParams = { ...xinfoParams };
    const cardUrl = "https://card.wb.ru/cards/detail";
    const sizes = {};

    for (let ix = 0; ix < articleNumbers.length; ix++) {
      cardParams.nm = articleNumbers[ix];

      const cardParamsString = querystring.stringify(cardParams);
      const cardResult = await session.get(`${cardUrl}?${cardParamsString}`);
      const cardResultJson = cardResult.data;
      cardResultJson.data.products.forEach((p) => {
        p.sizes.forEach((s) => {
          s.stocks.forEach((stock) => {
            const key = `${p.id}`;
            if (sizes[key]) {
              sizes[key][s.name] = stock.qty;
            } else {
              sizes[key] = {
                Art: p.id,
                [s.name]: stock.qty,
              };
            }
          });
        });
      });
    }

    const result = Object.values(sizes);
    return result;
  } catch (error) {
    console.error("An error occurred:", error.message);
    throw error;
  }
}

app.use((err, req, res, next) => {
  console.error("An error occurred:", err.message);
  res.status(500).json({ error: err.message });
});

app.get("/stocks", async (req, res) => {
  try {
    const result = await main();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`server start on ${port} port`);
});

import { COUNTRIES } from "../data/countries.js";

export function countriesIn(continentId) {
  return COUNTRIES.filter((c) => c.continent === continentId);
}

export function findCountry(code) {
  return COUNTRIES.find((c) => c.code === code);
}

import { parse } from "csv-parse/sync";
async function run() {
  const response = await fetch("https://docs.google.com/spreadsheets/d/1uCYeAKqtmWoWkcx5mG_fojXcwcu5hr2ibOB3kllynYA/gviz/tq?tqx=out:csv&sheet=Villas");
  const csvText = await response.text();
  const records = parse(csvText, { columns: true, skip_empty_lines: true });
  console.log(records[0]);
}
run();

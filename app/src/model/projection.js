import * as d3 from "d3";

const projection = d3.geoMercator()
  .center([12.5, 41.9])
  .translate([487.5, 305])
  .scale(500000);

export default projection;

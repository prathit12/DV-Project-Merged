// const width_pie = 300;
// const height2_pie = 300;
const radius = 150;

const data = [20, 80]; // 20% ICU admissions, 80% other
const colors = ["#FF6B6B", "#EDEDED"]; // Highlighted slice and background

const svg_pie_group = d3.select("#intropiechart");
const svg_pie = svg_pie_group
  .append("g")
  .attr("transform", "translate(150, 150)");

const arc = d3
  .arc()
  .innerRadius(radius - 50)
  .outerRadius(radius);

const pie = d3.pie().value((d) => d);

const arcs = svg_pie
  .selectAll("path")
  .data(pie(data))
  .enter()
  .append("path")
  .attr("d", arc)
  .attr("fill", (d, i) => colors[i])
  .attr("stroke", "#ffffff")
  .attr("stroke-width", 2)
  .each(function (d) {
    this._current = d;
  });

// Animate the 20% slice
arcs
  .transition()
  .duration(2000)
  .attrTween("d", function (d) {
    const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
    return function (t) {
      return arc(interpolate(t));
    };
  });

svg_pie
  .append("text")
  .attr("class", "percentage-label")
  .attr("text-anchor", "middle")
  .attr("dy", "0.35em")
  .text("Acute Care Admissions");

svg_pie
  .append("text")
  .attr("class", "icu-text")
  .attr("text-anchor", "middle")
  .attr("x", -110)
  .attr("y", -130)
  .text("ICU")
  .style("font-size", "18px")
  .style("font-weight", "bold");

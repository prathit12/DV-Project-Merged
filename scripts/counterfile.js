window.addEventListener("page3Active", function () {
  const counter = d3.select("#counter");
  const startValue = 0;
  const endValue = 56;
  const duration = 3000;
  d3.transition()
    .duration(duration)
    .tween("text", function () {
      const interpolate = d3.interpolateNumber(startValue, endValue);
      return function (t) {
        counter.text(Math.round(interpolate(t)));
      };
    });
});

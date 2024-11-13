
d3.csv('./Dataset/Processed/data_heatmap.csv').then(function(data) {
  data.forEach(d => d.duration_hrs = +d.duration_hrs);

  let minDuration = 0;
  let maxDuration = 500;

  const tooltip = d3.select("#tooltip");

  function renderHeatmap(filteredData) {
    const categoryData = Array.from({ length: 11 }, (_, i) => ({ index: i, alive: 0, dead: 0 }));

    filteredData.forEach(d => {
      const categoryIndex = +d.category_index;
      const expireFlag = +d.hospital_expire_flag;

      if (expireFlag === 0) {
        categoryData[categoryIndex].alive += 1;
      } else {
        categoryData[categoryIndex].dead += 1;
      }
    });

    categoryData.sort((a, b) => b.alive - a.alive || b.dead - a.dead);

    d3.select("#heatmap").selectAll(".cell").remove();
    d3.select(".x-axis-labels").selectAll("div").remove();

    const aliveColor = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, d3.max(categoryData, d => d.alive)]);
    const deadColor = d3.scaleSequential(d3.interpolateReds)
      .domain([0, d3.max(categoryData, d => d.dead)]);

    categoryData.forEach((category) => {
      d3.select("#heatmap").append("div")
        .attr("class", "cell")
        .style("background-color", category.alive === 0 ? "#FFFFFF" : aliveColor(category.alive))
        .on("mouseover", (event) => showTooltip(event, `Alive: ${category.alive}`))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);
    });

    categoryData.forEach((category) => {
      d3.select("#heatmap").append("div")
        .attr("class", "cell")
        .style("background-color", category.dead === 0 ? "#FFFFFF" : deadColor(category.dead))
        .on("mouseover", (event) => showTooltip(event, `Dead: ${category.dead}`))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);
    });

    const procedures = [
      "Other", "Infectious Diseases", "Injuries and Fractures", "Pregnancy and Perinatal Conditions",
      "Mental Health and Behavioral Disorders", "Musculoskeletal Disorders", "Blood and Lymphatic Disorders",
      "Neurological Conditions", "Respiratory Disorders", "Digestive System Disorders", "Cancer and Neoplastic Diseases"
    ];

    d3.select(".x-axis-labels")
      .selectAll("div")
      .data(categoryData)
      .enter()
      .append("div")
      .text(d => procedures[d.index]);
  }

  function showTooltip(event, text) {
    tooltip.style("opacity", 1)
      .html(text);
  }

  function moveTooltip(event) {
    tooltip.style("top", (event.pageY - 10) + "px")
      .style("left", (event.pageX + 10) + "px");
  }

  function hideTooltip() {
    tooltip.style("opacity", 0);
  }

  renderHeatmap(data);

  const sliderWidth = 400;
  const slider = d3.select("#slider-container").append("svg")
    .attr("width", sliderWidth)
    .attr("height", 60);

  const xScale = d3.scaleLinear().domain([0, 500]).range([10, sliderWidth - 10]);

  const brush = d3.brushX()
    .extent([[0, 0], [sliderWidth, 40]])
    .on("brush end", updateHeatmap);

  const brushG = slider.append("g")
    .attr("class", "brush")
    .call(brush)
    .call(brush.move, [xScale(minDuration), xScale(maxDuration)]);

  const handleLeft = slider.append("circle")
    .attr("class", "handle")
    .attr("r", 8)
    .attr("cy", 20)
    .attr("cx", xScale(minDuration));

  const handleRight = slider.append("circle")
    .attr("class", "handle")
    .attr("r", 8)
    .attr("cy", 20)
    .attr("cx", xScale(maxDuration));

  slider.append("text")
    .attr("x", 0)
    .attr("y", 55)
    .attr("id", "slider-label-min")
    .text("0 hrs");

  slider.append("text")
    .attr("x", sliderWidth - 30)
    .attr("y", 55)
    .text("500 hrs");

  function updateHeatmap(event) {
    if (!event.selection) return;


    const [minX, maxX] = event.selection.map(xScale.invert);
    minDuration = Math.max(0, Math.min(500, Math.round(minX))); 
    maxDuration = Math.max(0, Math.min(500, Math.round(maxX))); 

    d3.select("#durationRange").text(`(${minDuration} - ${maxDuration} hrs)`);

    const filteredData = data.filter(d => d.duration_hrs >= minDuration && d.duration_hrs <= maxDuration);
    renderHeatmap(filteredData);

    handleLeft.attr("cx", xScale(minDuration));
    handleRight.attr("cx", xScale(maxDuration));
  }
}).catch(function(error) {
  console.error('Error loading the CSV data:', error);
});


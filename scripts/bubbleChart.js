const width = 1160; 
const height = 600;
const margin = { top: 20, right: 200, bottom: 50, left: 100 }; 
const maxRadius = 15; 

const xScale = d3
  .scalePoint()
  .range([margin.left - 30, width - 30 - margin.right])
  .padding(2);
const yScale = d3
  .scaleTime()
  .range([margin.top + height * 0.05 - 10, height - margin.bottom - 20]);
const colorScale = d3
  .scaleOrdinal()
  .range([
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
    "#aec7e8",
    "#ffbb78",
    "#98df8a",
    "#ff9896",
    "#c5b0d5",
    "#c49c94",
    "#f7b6d2",
    "#dbdb8d",
    "#9edae5",
    "#393b79",
  ]);

const svg = d3
  .select("#bubbleSvg")
  .attr("width", width)
  .attr("height", height)
  .append("g")
  .attr("transform", `translate(${margin.left}-10,${margin.top})`); 


const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "bubble-tooltip")
  .style("opacity", 0)
  .style("position", "absolute")
  .style("pointer-events", "none");

const legendContainer = svg
  .append("foreignObject")
  .attr("class", "legend-container")
  .attr("width", 175)
  .attr("height", height / 2 + 100) 
  .attr("x", width - 175) 
  .attr("y", 20)
  .append("xhtml:div");

let inputEvents, dItems, dItemsMap, deathsData;
let death_ids_bubble = new Set();
Promise.all([
  d3.csv("./Dataset/Processed/final_data_heatmap.csv"),
  d3.csv("./Dataset/icu/inputevents.csv"),
  d3.csv("./Dataset/icu/d_items.csv"),
])
  .then(([heatMapData, inputEventsData, dItemsData]) => {
    deathsData = heatMapData;
    inputEvents = inputEventsData;
    dItems = dItemsData;
    deathsData.forEach((d) => {
      if (d["hospital_expire_flag"] == "1") {
        death_ids_bubble.add(d["hadm_id"]);
      }
    });
    dItemsMap = new Map();
    dItems.forEach((d) => {
      if (d.itemid) {
        dItemsMap.set(d.itemid, d.label || "Unknown");
      }
    });

    const uniqueStayIds = [...new Set(inputEvents.map((d) => d.hadm_id))];
    const dropdown = d3.select("#stayDropdown").property("value", "overall");
    uniqueStayIds.forEach((stay_id) => {
      if (death_ids_bubble.has(stay_id)) {
        dropdown
          .append("option")
          .attr("value", stay_id)
          .text(stay_id)
          .style("background-color", "#8b0303") 
          .style("color", "whitesmoke");
      }
      dropdown.append("option").attr("value", stay_id).text(stay_id);
    });

    if (uniqueStayIds.length > 0) {
      dropdown.property("value", "overall");
      showOverallChart();
    } else {
      showOverallChart();
    }

    dropdown.on("change", function () {
      const selectedStayId = this.value;
      if (death_ids_bubble.has(selectedStayId)) {
        d3.select("#bubbleDead").style("opacity", 1);
      } else {
        d3.select("#bubbleDead").style("opacity", 0);
      }
      const timeRangeContainer = d3.select("#timeRangeContainer");

      if (selectedStayId === "overall") {
        timeRangeContainer
          .transition()
          .duration(500)
          .style("opacity", 0)
          .end()
          .then(() => {
            timeRangeContainer.style("display", "none");
            showOverallChart();
          });
      } else {
        const filteredData = inputEvents.filter(
          (d) => d.hadm_id === selectedStayId
        );
        const minTime = d3.min(filteredData, (d) => new Date(d.starttime));
        const maxTime = d3.max(filteredData, (d) => new Date(d.endtime));

        const timeSlider = d3.select("#timeRange");
        timeSlider.property("value", 0);
        d3.select("#timeOutput").text("0");

        d3.select("#minTime").text(minTime.toLocaleString());
        d3.select("#CurrTime").text(minTime.toLocaleString());
        d3.select("#maxTime").text(maxTime.toLocaleString());

        timeRangeContainer
          .style("display", "block")
          .style("opacity", 0)
          .transition()
          .duration(500)
          .style("opacity", 1);

        updateChart(selectedStayId);
      }
    });

    d3.select("#timeRange").on("input", function () {
      const selectedStayId = dropdown.property("value");
      if (selectedStayId) {
        updateChart(selectedStayId);
      }
      updateMinMaxTime();
    });

    updateMinMaxTime();
  })
  .catch((error) => {
    console.error("Error loading data:", error);
  });

function updateChart(stayId) {
  svg.selectAll("*").interrupt();
  if (window.currentSimulation) {
    window.currentSimulation.stop();
  }

  if (!stayId || stayId === "overall") {
    showOverallChart();
    return;
  }
  const filteredData = inputEvents.filter((d) => d.hadm_id === stayId);
  const timeRangeValue = +d3.select("#timeRange").property("value");
  const minTime = d3.min(filteredData, (d) => new Date(d.starttime));
  const maxTime = d3.max(filteredData, (d) => new Date(d.endtime));
  const timeRange = d3.scaleTime().domain([minTime, maxTime]).range([0, 100]);

  const filteredByTime = filteredData.filter((d) => {
    const startTime = new Date(d.starttime);
    return timeRange(startTime) <= timeRangeValue;
  });

  const aggregatedData = d3
    .rollups(
      filteredByTime,
      (v) => {
        const firstEvent = v[0];
        return {
          frequency: v.length,
          order_category_name: firstEvent.ordercategoryname,
          times: v
            .map((d) => ({
              starttime: new Date(d.starttime),
              endtime: new Date(d.endtime),
              amount: d.amount,
              amountuom: d.amountuom,
              rate: d.rate,
              rateuom: d.rateuom,
            }))
            .sort((a, b) => a.starttime - b.starttime),
        };
      },
      (d) => d.itemid
    )
    .map(([item_id, d]) => {
      const abbreviation = dItemsMap.get(String(item_id)) || "Unknown";
      return {
        item_id,
        abbreviation,
        order_category_name: d.order_category_name,
        frequency: d.frequency,
        times: d.times,
      };
    });

  const combinedData = d3
    .groups(aggregatedData, (d) => d.item_id)
    .map(([item_id, values]) => {
      const combinedTimes = values.flatMap((d) => d.times);
      return {
        item_id,
        abbreviation: values[0].abbreviation,
        order_category_name: values[0].order_category_name,
        frequency: combinedTimes.length,
        times: combinedTimes.sort((a, b) => a.starttime - b.starttime),
      };
    });

  const bubbleCount = combinedData.length;
  const availableWidth = width - margin.left - margin.right;
  const availableHeight = height - margin.top - margin.bottom;
  const maxBubbleSize =
    Math.min(availableWidth / bubbleCount, availableHeight / bubbleCount) / 1.5; 

  const sizeScale = d3
    .scaleSqrt()
    .domain([0, d3.max(combinedData, (d) => d.frequency)])
    .range([5, Math.min(maxBubbleSize, 20)]); 

  xScale.domain([...new Set(combinedData.map((d) => d.order_category_name))]);
  yScale
    .domain([minTime, maxTime])
    .range([height - margin.bottom - maxRadius, margin.top + maxRadius]);

  svg.selectAll("circle").remove();
  svg.selectAll("text.abbreviation").remove();

  xScale.range([margin.left + maxRadius, width - margin.right - maxRadius]);
  yScale.range([margin.top + maxRadius, height - margin.bottom - maxRadius]);

  const simulation = d3
    .forceSimulation(combinedData)
    .force("x", d3.forceX((d) => xScale(d.order_category_name)).strength(0.2))
    .force(
      "y",
      d3
        .forceY((d) => {
          const timePosition = yScale(d.times[0].starttime);
          return Math.max(
            margin.top + maxRadius,
            Math.min(height - margin.bottom - maxRadius, timePosition)
          );
        })
        .strength(0.2)
    )
    .force(
      "collide",
      d3.forceCollide((d) => sizeScale(d.frequency) + 1).strength(0.7)
    )
    .alphaDecay(0.02)
    .velocityDecay(0.3); 

  window.currentSimulation = simulation;

  svg
    .selectAll("circle")
    .transition()
    .duration(500)
    .style("opacity", 0)
    .remove();

  const circles = svg.selectAll("circle").data(combinedData, (d) => d.item_id);

  const circlesEnter = circles
    .enter()
    .append("circle")
    .attr("cx", width / 2) 
    .attr("cy", height / 2)
    .attr("r", 0)
    .attr("fill", (d) => colorScale(d.order_category_name))
    .attr("opacity", 0);

  circles
    .merge(circlesEnter)
    .transition()
    .duration(1000)
    .attr("r", (d) => sizeScale(d.frequency))
    .attr("opacity", 0.8);

  simulation.on("tick", () => {
    svg
      .selectAll("circle")
      .attr("cx", (d) =>
        Math.max(
          margin.left + sizeScale(d.frequency),
          Math.min(width - margin.right - sizeScale(d.frequency), d.x)
        )
      )
      .attr("cy", (d) =>
        Math.max(
          margin.top + sizeScale(d.frequency),
          Math.min(height - margin.bottom - sizeScale(d.frequency), d.y)
        )
      );
  });

  setTimeout(() => {
    updateLegend(combinedData);
  }, 1000);

  circlesEnter
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);

      const firstTime = d.times[0].starttime.toLocaleString();
      const lastTime = d.times[d.times.length - 1].starttime.toLocaleString();

      const stats = `
                <div class="tooltip-content">
                    <p><strong>Category:</strong> ${d.order_category_name.substring(
                      3
                    )}</p>
                    <p><strong>Product:</strong> ${d.abbreviation}</p>
                    <p><strong>Administrations:</strong> ${d.frequency}</p>
                    <p><strong>First:</strong> ${firstTime}</p>
                    <p><strong>Last:</strong> ${lastTime}</p>
                </div>
            `;

      tooltip
        .html(stats)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 30 + "px")
        .transition()
        .duration(200)
        .style("opacity", 1);
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", null);
      tooltip.transition().duration(200).style("opacity", 0);
    });
    
  tooltip.on("mouseleave", function () {
    tooltip.transition().duration(200).style("opacity", 0);
  });

  simulation.alpha(1).restart();
}

function showOverallChart() {
  svg.selectAll("*").interrupt();
  if (window.currentSimulation) {
    window.currentSimulation.stop();
  }

  const aggregatedData = d3
    .rollups(
      inputEvents,
      (v) => v.length,
      (d) => d.itemid
    )
    .map(([item_id, frequency]) => {
      const abbreviation = dItemsMap.get(String(item_id)) || "Unknown";
      const matchingEvent = inputEvents.find((d) => d.itemid === item_id);
      const order_category_name = matchingEvent
        ? matchingEvent.ordercategoryname
        : "Unknown";
      return {
        item_id,
        abbreviation,
        order_category_name,
        frequency,
      };
    });

  const sizeScale = d3
    .scaleSqrt()
    .domain([0, d3.max(aggregatedData, (d) => d.frequency)])
    .range([5, 25]);

  svg.selectAll("circle").remove();
  svg.selectAll("text.abbreviation").remove();

  svg
    .selectAll("circle")
    .transition()
    .duration(500)
    .style("opacity", 0)
    .remove();

  const simulation = d3
    .forceSimulation(aggregatedData)
    .force("x", d3.forceX(width / 2.2).strength(0.08))
    .force("y", d3.forceY(height / 2).strength(0.08))
    .force("charge", d3.forceManyBody().strength(-30))
    .force(
      "collide",
      d3
        .forceCollide((d) => sizeScale(d.frequency) + 2)
        .strength(0.9)
        .iterations(2)
    )
    .alphaDecay(0.05)
    .velocityDecay(0.4);

  window.currentSimulation = simulation;

  simulation.on("tick", () => {
    svg
      .selectAll("circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y);
  });

  const circles = svg
    .selectAll("circle")
    .data(aggregatedData, (d) => d.item_id);

  circles.exit().remove();

  const circlesEnter = circles
    .enter()
    .append("circle")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", 0)
    .attr("fill", (d) => colorScale(d.order_category_name))
    .attr("opacity", 0);

  circles
    .merge(circlesEnter)
    .transition()
    .duration(800)
    .delay((d, i) => i * 3)
    .attr("r", (d) => sizeScale(d.frequency))
    .attr("opacity", 0.8)
    .ease(d3.easeBackOut.overshoot(1.2));

  circlesEnter
    .on("mouseover", function (event, d) {
      const stats = `
                <p><strong>Category:</strong> ${d.order_category_name.substring(
                  3
                )}</p>
                <p><strong>Product Description:</strong> ${d.abbreviation}</p>
                <p><strong>Frequency:</strong> ${d.frequency}</p>
            `;
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(stats)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 30 + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    });

  function float() {
    simulation.alpha(0.3).alphaDecay(0.02).restart();
    setTimeout(float, 4000); 
  }
  float();


  setTimeout(() => {
    updateLegend(aggregatedData);
  }, 1200);
}

function updateLegend(data) {
  if (!data || !Array.isArray(data)) {
    console.warn("Invalid data passed to updateLegend");
    return;
  }

  const categories = Array.from(
    new Set(data.map((d) => d.order_category_name || "Unknown"))
  ).sort();

  legendContainer.selectAll("*").remove();

  if (categories.length === 0) {
    console.warn("No categories found in data");
    return;
  }


  legendContainer
    .append("div")
    .style("font-weight", "bold")
    .style("margin-bottom", "5px")
    .style("font-size", "11px")
    .text("Categories");

  const legendItems = d3
    .select(legendContainer.node())
    .selectAll(".legend-item")
    .data(categories)
    .enter()
    .append("div")
    .attr("class", "legend-item")
    .style("display", "flex")
    .style("align-items", "center");

  legendItems
    .append("div")
    .style("min-width", "12px")
    .style("height", "12px")
    .style("background-color", (d) => colorScale(d))
    .style("border", "1px solid #ccc");

  legendItems.append("span").text((d) => {
    const count = data.filter((item) => item.order_category_name === d).length;
    return `${d.substring(3)} (${count})`;
  });


  legendItems.on("click", function (event, category) {
    const item = d3.select(this);
    const isActive = !item.classed("inactive");

    item.classed("inactive", isActive);
    item.select("div").style("opacity", isActive ? 0.3 : 1);

    svg
      .selectAll("circle")
      .filter((d) => d.order_category_name === category)
      .style("opacity", isActive ? 0.2 : 0.8)
      .style("pointer-events", isActive ? "none" : "all");
  });

  legendItems.style("padding", "3px 0").style("font-size", "11px");
}

function updateBoundary(node, r) {
  node.x = Math.max(
    margin.left + r,
    Math.min(width - margin.right - r - 150, node.x)
  ); 
  node.y = Math.max(
    margin.top + r,
    Math.min(height - margin.bottom - r, node.y)
  );
}

function resetVisualization() {
  svg.selectAll("circle").style("opacity", 0.8).style("pointer-events", "all");

  legendContainer
    .selectAll(".legend-item")
    .classed("inactive", false)
    .select("div")
    .style("opacity", 1);
}

d3.select("#resetButton").on("click", resetVisualization);

d3.select("#timeRange").on(
  "input",
  debounce(function () {
    const selectedStayId = d3.select("#stayDropdown").property("value");
    if (selectedStayId) {
      resetVisualization();
      updateChart(selectedStayId);
    }
    updateMinMaxTime();
  }, 100)
);


function updateMinMaxTime() {
  const selectedStayId = d3.select("#stayDropdown").property("value");
  const timeRangeValue = +d3.select("#timeRange").property("value");

  if (!selectedStayId || selectedStayId === "overall") return;

  const filteredData = inputEvents.filter((d) => d.hadm_id === selectedStayId);
  const minTime = d3.min(filteredData, (d) => new Date(d.starttime));
  const maxTime = d3.max(filteredData, (d) => new Date(d.endtime));

  const currentTime = new Date(
    minTime.getTime() +
      (maxTime.getTime() - minTime.getTime()) * (timeRangeValue / 100)
  );

  d3.select("#minTime").text(minTime.toLocaleString());
  d3.select("#maxTime").text(maxTime.toLocaleString());
  d3.select("#CurrTime").text(currentTime.toLocaleString());
  d3.select("#timeOutput").text(timeRangeValue);
}

const styleSheet = document.createElement("style");
styleSheet.textContent = `
    .bubble-tooltip {
        position: absolute;
        background: rgba(255, 255, 255, 0.95);
        padding: 10px;
        border: 1px solid #333;
        border-radius: 5px;
        pointer-events: none;
        font-size: 12px;
        box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.3);
        z-index: 1000;
    }
    
    .tooltip-content p {
        margin: 4px 0;
    }

    .visualization-container {
        display: flex;
        gap: 20px;
        align-items: flex-start;
    }

    .chart-container {
        flex: 0 0 auto;
    }

    .sidebar {
        flex: 0 0 280px;
        padding: 15px;
        background: #f5f5f5;
        border-radius: 8px;
        max-height: 600px;
        overflow-y: auto;
    }

    .legend-container {
        margin-bottom: 20px;
        padding: 10px;
        background: white;
        border-radius: 5px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .legend-item {
        padding: 5px 0;
        border-bottom: 1px solid #eee;
    }

    .legend-item:last-child {
        border-bottom: none;
    }
    
    #timeRangeContainer {
        position: relative;
        padding: 15px;
        background: #f5f5f5;
        border-radius: 5px;
        margin: 10px 0;
    }

    .time-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 5px;
        font-size: 12px;
    }

    .current-time {
        text-align: center;
        font-weight: bold;
        color: #2c5282;
        margin: 5px 0;
    }
`;
document.head.appendChild(styleSheet);

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

window.addEventListener('page6Active', function() {
  showOverallChart();
});
d3.csv("/Dataset/Processed/final_data_heatmap.csv").then(function (data) {
  const tooltipHeatMap = d3.select("#tooltipHeatMap");

  data.forEach((d) => {
    d.surgery_type_index = +d.surgery_type_index;
    d.hospital_expire_flag = +d.hospital_expire_flag;
    d.severity_level = +d.severity_level;
  });

  const procedures = [
    "cardiovascular",
    "kidney",
    "gastrointestinal",
    "musculoskeletal",
    "respiratory",
    "neurological",
    "others",
  ];

  function renderHeatmap(filterType = "all") {
    const categoryData = [
      { severity: "Low Severity Dead", counts: Array(7).fill(0) },
      { severity: "Low Severity Alive", counts: Array(7).fill(0) },
      { severity: "Medium Severity Dead", counts: Array(7).fill(0) },
      { severity: "Medium Severity Alive", counts: Array(7).fill(0) },
      { severity: "High Severity Dead", counts: Array(7).fill(0) },
      { severity: "High Severity Alive", counts: Array(7).fill(0) },
    ];

    data.forEach((d) => {
      const surgeryType = +d.surgery_type_index;
      const expireFlag = +d.hospital_expire_flag;
      const severity = d.severity_level;

      let row = -1;
      if (severity >= 1 && severity <= 3) {
        row = expireFlag === 0 ? 1 : 0;
      } else if (severity >= 4 && severity <= 6) {
        row = expireFlag === 0 ? 3 : 2;
      } else if (severity >= 7 && severity <= 10) {
        row = expireFlag === 0 ? 5 : 4;
      }

      if (row !== -1 && surgeryType >= 0 && surgeryType < 7) {
        categoryData[row].counts[surgeryType] += 1;
      }
    });

    let filteredCategoryData;
    if (filterType === "alive") {
      filteredCategoryData = categoryData.filter((d) =>
        d.severity.includes("Alive")
      );
    } else if (filterType === "dead") {
      filteredCategoryData = categoryData.filter((d) =>
        d.severity.includes("Dead")
      );
    } else {
      filteredCategoryData = categoryData;
    }

    const highSeverityDeadCounts = categoryData[4]?.counts || [];
    const sortedIndices = highSeverityDeadCounts
      .map((count, index) => ({ count, index }))
      .sort((a, b) => b.count - a.count)
      .map((d) => d.index);
    const sortedProcedures = sortedIndices.map((index) => procedures[index]);

    d3.select("#heatmap").selectAll(".cell").remove();
    d3.select(".x-axis-labels").selectAll("div").remove();
    d3.select(".y-axis-labels").selectAll("div").remove();

    const yLabels =
      filterType === "all"
        ? [
            "Dead",
            "Low Severity",
            "Cured",
            "Dead",
            "Medium Severity",
            "Cured",
            "Dead",
            "High Severity",
            "Cured",
          ]
        : ["Low Severity", "Medium Severity", "High Severity"];
    d3.select(".y-axis-labels")
      .selectAll("div")
      .data(yLabels)
      .enter()
      .append("div")
      .attr("class", "y-label")
      .text((d) => d)
      .style("grid-row", (d, i) => `${i + 1}`)
      .style("font-size", (d, i) => {
        if (filterType !== "all") {
          return "1rem";
        }
        if (i % 3 == 1) {
          return "1.2rem";
        }
        return "0.9rem";
      })
      .style("font-weight", (d, i) => {
        if (filterType !== "all") {
          return "bold";
        }
        if (i % 3 == 1) {
          return "bold";
        }
        return "500";
      })
      //   .style("border-top", (d, i) => (i % 3 === 0 ? "1px solid black" : "none"))
      // .style("border-left", "1px solid black")
      .style("border-bottom", (d, i) => {
        if (filterType !== "all") {
          return "none";
        }
        return i % 3 === 2 ? "1px solid lightgrey" : "none";
      });

    const rowCount = filterType === "all" ? 6 : 3;
    const heatmapHeight = filterType === "all" ? "500px" : "250px";
    d3.select(".heatmap")
      .style("grid-template-rows", `repeat(${rowCount}, 1fr)`)
      .style("height", heatmapHeight);

    d3.select(".y-axis-labels").style(
      "grid-template-rows",
      `repeat(${rowCount}, 1fr)`
    );

    const maxCount = d3.max(filteredCategoryData.flatMap((d) => d.counts)) || 1;
    const aliveColor = d3.scaleSequential(d3.interpolateBlues).domain([0, 61]);
    const deadColor = d3.scaleSequential(d3.interpolateReds).domain([0, 7]);

    filteredCategoryData.forEach((row, rowIndex) => {
      sortedIndices.forEach((colIndex) => {
        const count = row.counts[colIndex];
        const isDead = row.severity.includes("Dead");

        const cell = d3
          .select("#heatmap")
          .append("div")
          .attr("class", "cell")
          .classed("blinking", (d) => {
            if (count > 0) {
              return isDead;
            }
          })
          .style(
            "background-color",
            count === 0
              ? "#FFFFFF"
              : isDead
              ? deadColor(count)
              : aliveColor(count)
          )
          .style("opacity", 0)
          .on("mouseover", (event) =>
          {
            let op_type = procedures[colIndex].charAt(0).toUpperCase() + procedures[colIndex].slice(1).toLowerCase();
            let severity =  row.severity.split(' ')
            let severity_type = (severity[0] + " " +severity[1]).toLowerCase();
            let operation = (severity[2]==="Alive")?"cured":"deceased";
            showTooltip(
              event,
              `<b>${op_type}'s ${severity_type}</b> procedures have <b>${count} ${operation}</b> cases`
            )
          }
            
          )
          .on("mousemove", moveTooltip)
          .on("mouseout", hideTooltip)
          .style("grid-row", `${rowIndex + 1}`)
          .style("border", count > 0 ? "2px solid #B3C7C6" : "1px solid #ccc")
          .style("box-shadow", count > 0 ? "2px 5px 10px #B3C7C6" : "none");

        cell.transition().duration(2000).style("opacity", 1);
      });
    });

    d3.select(".x-axis-labels")
      .selectAll("div")
      .data(sortedProcedures)
      .enter()
      .append("div")
      .text((d) => d);

    renderScales(maxCount, filterType);
    adjustXAxisAlignment();
  }

  function adjustXAxisAlignment() {
    const yLabels = document.querySelectorAll(".y-label");
    let maxWidth = 0;

    yLabels.forEach((label) => {
      const labelWidth = label.offsetWidth;
      if (labelWidth > maxWidth) {
        maxWidth = labelWidth;
      }
    });

    const xAxisLabels = document.querySelector(".x-axis-labels");
    xAxisLabels.style.marginLeft = `${maxWidth}px`;
  }

  function renderScales(maxCount, filterType) {
    d3.select("#aliveScale svg").html("");
    d3.select("#deadScale svg").html("");
    d3.select("#aliveScale").style(
      "display",
      filterType === "dead" ? "none" : "block"
    );
    d3.select("#deadScale").style(
      "display",
      filterType === "alive" ? "none" : "block"
    );

    if (filterType !== "dead") {
      d3.select("#aliveMax").text(61);
      const aliveGradient = d3
        .select("#aliveScale svg")
        .append("defs")
        .append("linearGradient")
        .attr("id", "aliveGradient")
        .attr("x1", "0%")
        .attr("x2", "100%");
      aliveGradient
        .selectAll("stop")
        .data(d3.range(0, 1.01, 0.01))
        .enter()
        .append("stop")
        .attr("offset", (d) => `${d * 100}%`)
        .attr("stop-color", (d) => d3.interpolateBlues(d));
      d3.select("#aliveScale svg")
        .append("rect")
        .attr("width", 150)
        .attr("height", 20)
        .style("fill", "url(#aliveGradient)");
    }

    if (filterType !== "alive") {
      d3.select("#deadMax").text(7);
      const deadGradient = d3
        .select("#deadScale svg")
        .append("defs")
        .append("linearGradient")
        .attr("id", "deadGradient")
        .attr("x1", "0%")
        .attr("x2", "100%");
      deadGradient
        .selectAll("stop")
        .data(d3.range(0, 1.01, 0.01))
        .enter()
        .append("stop")
        .attr("offset", (d) => `${d * 100}%`)
        .attr("stop-color", (d) => d3.interpolateReds(d));
      d3.select("#deadScale svg")
        .append("rect")
        .attr("width", 150)
        .attr("height", 20)
        .style("fill", "url(#deadGradient)");
    }
  }

  function showTooltip(event, text) {
    console.log("showing!");
    tooltipHeatMap
      .style("opacity", 1)
      .html(text)
      .style("left", event.pageX + 15 + "px")
      .style("top", event.pageY - 30 + "px");
  }

  function moveTooltip(event) {
    console.log("move");
    tooltipHeatMap
      .style("left", event.pageX + 15 + "px")
      .style("top", event.pageY - 30 + "px");
  }

  function hideTooltip() {
    console.log("hidden");
    tooltipHeatMap.style("opacity", 0);
  }

  renderHeatmap();

  d3.select("#filter").on("change", function () {
    const filterValue = this.value;
    renderHeatmap(filterValue);
  });
});

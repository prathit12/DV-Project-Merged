let stays = [];

const vitals_path = "/Dataset/icu/charteventssubset.csv";
const medicatons_path = "/Dataset/icu/medicationinput.csv";
const deaths_path = "/Dataset/Processed/final_data_heatmap.csv";
let selected_data;
let medications_data = [];
let death_ids = new Set();
document.addEventListener("DOMContentLoaded", function () {
  let setOfStays = new Set();
  
  d3.csv(deaths_path).then((data) => {
    data.map((d) => {
      if (d["hospital_expire_flag"] == "1") {
        death_ids.add(d["hadm_id"]);
      }
    });
    d3.csv(vitals_path).then((data) => {
        data.map((d) => {
          setOfStays.add(d["hadm_id"]);
        });
        stays = Array.from(setOfStays).sort();
        var stay_select = document.getElementById("stay_select");
        stays.forEach(function (col_name) {
          var new_option = document.createElement("option");
          new_option.value = col_name;
          new_option.text = col_name;
          if(death_ids.has(col_name)){
            new_option.style.backgroundColor = "#8b0303";
            new_option.style.color = "whitesmoke";
          }
          stay_select.appendChild(new_option);
        });
        document.getElementById("stay_select").value = stays[0];
        getData();
      });
  });
  
});

function removeAllOptions(id) {
  const selectObj = document.getElementById(id);
  while (selectObj.options.length > 0) {
    selectObj.remove(0);
  }
}
function getData() {
  const stay_id = document.getElementById("stay_select").value;
  if(death_ids.has(stay_id)){
    d3.select("#lineDead").style("opacity",1);
  }else{
    d3.select("#lineDead").style("opacity",0);
  }
  const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
  d3.csv(vitals_path).then((data) => {
    let setOfStays = new Set();
    data.map((d) => {
      setOfStays.add(d["hadm_id"]);
    });
    stays = Array.from(setOfStays).sort();
    var stay_select = document.getElementById("stay_select");
    stays.forEach(function (col_name) {
      var new_option = document.createElement("option");
      new_option.value = col_name;
      new_option.text = col_name;
      stay_select.appendChild(new_option);
    });
    // document.getElementById("stay_select").value = stays[0];

    individual_data = data
      .filter((d) => d["hadm_id"] == stay_id)
      .map((d) => ({
        hadm_id: +d["hadm_id"],
        item_id: +d["itemid"],
        valuenum: +d["valuenum"],
        charttime: parseTime(d["charttime"]),
      }));
    selected_data = individual_data;
    // console.log("Selected id data : ", selected_data);

    d3.csv(medicatons_path).then((data1) => {
      individual_data1 = data1
        .filter((d1) => d1["hadm_id"] == stay_id)
        .map((d1) => ({
          hadm_id: +d1["hadm_id"],
          ordercategoryname: d1["ordercategoryname"],

          starttime: parseTime(d1["starttime"]),
        }));
      medications_data = individual_data1;
      drawHeartChart();
      drawOxygenChart();
      drawRespChart();

    });
  });
}
const categories = Array.from(
  new Set(medications_data.map((d1) => d1[ordercategoryname]))
);
const color_scale = d3
  .scaleOrdinal()
  .domain(categories)
  .range(d3.schemeCategory10);

function drawHeartChart() {
  var margin = { top: 20, right: 50, bottom: 20, left: 60 },
    width = 800 - margin.left - margin.right,
    height = 175 - margin.top - margin.bottom;
  const filtered_data = selected_data
    .filter((data) => data["item_id"] == 220045)
    .sort((a, b) => new Date(a["charttime"]) - new Date(b["charttime"]));
  // console.log("Heart Rate : " , filtered_data);
  d3.select("#heart_value").text(filtered_data[0].valuenum);

  // console.log(d3.extent(filtered_data, function(d) { return d.charttime; }));

  var svg = d3.select("#hr_chart");
  svg.selectAll("*").remove();
  svg = svg
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3
    .scaleTime()
    .domain(
      d3.extent(filtered_data, function (d) {
        return d.charttime;
      })
    )
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0 ," + height + ")")
    .attr("stroke", "white")
    .call(d3.axisBottom(x))
    .selectAll("path")
    .style("stroke", "white");
  svg.selectAll(".tick line").style("stroke", "white");

  var y = d3
    .scaleLinear()
    .domain([
      d3.min(filtered_data, function (d) {
        return +d.valuenum;
      }),
      d3.max(filtered_data, function (d) {
        return +d.valuenum;
      }),
    ])
    .range([height, 0]);
  svg
    .append("g")
    .attr("stroke", "white")
    .call(d3.axisLeft(y))
    .selectAll("path")
    .style("stroke", "white");
  svg.selectAll(".tick line").style("stroke", "white");

  const heart_line = d3
    .line()
    .x((d) => x(d.charttime))
    .y((d) => y(d.valuenum));

  svg
    .selectAll("path.line")
    .data([filtered_data], (d) => d.charttime)
    .join((enter) =>
      enter
        .append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("d", heart_line)
        .attr("stroke-dasharray", function () {
          const length = this.getTotalLength();
          return `${length} ${length}`;
        })
        .attr("stroke-dashoffset", function () {
          return this.getTotalLength();
        })

        .transition()
        .duration(15000)
        .attr("stroke-dashoffset", 0)
    );

  function getValuenumForTime(time) {
    const closest = filtered_data.reduce((prev, curr) => {
      return Math.abs(curr.charttime - time) < Math.abs(prev.charttime - time)
        ? curr
        : prev;
    });
    return closest.valuenum;
  }

  setTimeout(() => {
    svg
      .selectAll("circle.data-point")
      .data(medications_data, (d1) => d1.starttime)
      .join((enter) =>
        enter
          .append("circle")
          .attr("class", "data-point")
          .attr("r", 5)
          .attr("fill", (d1) => color_scale(d1.ordercategoryname))
          .attr("cx", (d1) => x(d1.starttime))
          .attr("cy", (d1) => {
            const matchingValuenum = getValuenumForTime(d1.starttime);
            return matchingValuenum ? y(matchingValuenum) : null;
          })
          .style("opacity", 0)
          .transition()

          .duration(1000)
          .style("opacity", 1)
      )
      .on("mouseover", function (event, d1) {
          const tooltipLine = d3.select('#tooltipLine');
          tooltipLine.transition().duration(200).style('opacity', 1);
          tooltipLine.html(d1.ordercategoryname.substring(3))
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 30) + 'px');
      })

      .on("mousemove", function (event) {
        d3.select('#tooltipLine')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
      })

      .on("mouseout", function (event) {
        d3.select('#tooltipLine').transition().duration(500).style('opacity', 0);
      })
      .attr("class", (d1) =>
        color_scale(d1.ordercategoryname) ? "meds-circle" : " "
      );
  }, 15000);

  const click_circle = svg
    .selectAll("click_circle")
    .data(filtered_data)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.charttime))
    .attr("cy", (d) => y(d.valuenum))
    .attr("r", 3)
    .attr("fill", "blue");
  click_circle.on("mouseover", function (event, d) {
    d3.select(this)
      .transition()
      .duration(10)
      .attr("r", 4)
      .attr("fill", "cyan")

      .transition()
      .duration(2000)
      .attr("r", 3)
      .attr("fill", "blue");
  });
  click_circle.on("click", function (event, d) {
    d3.select("#heart_value").text(d.valuenum);
  });

}

function drawOxygenChart() {
  var margin = { top: 20, right: 50, bottom: 20, left: 60 },
    width = 800 - margin.left - margin.right, 
    height = 175 - margin.top - margin.bottom;
  const filtered_data = selected_data
    .filter((data) => data["item_id"] == 220277)
    .sort((a, b) => new Date(a["charttime"]) - new Date(b["charttime"]));
  // console.log("Oxygen Rate : " , filtered_data);
  d3.select("#oxygen_value").text(filtered_data[0].valuenum);

  // console.log(d3.extent(filtered_data, function(d) { return d.charttime; }));

  var svg = d3.select("#o2_chart");
  svg.selectAll("*").remove();
  svg = svg
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3
    .scaleTime()
    .domain(
      d3.extent(filtered_data, function (d) {
        return d.charttime;
      })
    )
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + (height - 5) + ")")
    .attr("stroke", "white")
    .call(d3.axisBottom(x))
    .selectAll("path")
    .style("stroke", "white");
  svg.selectAll(".tick line").style("stroke", "white");

  var y = d3
    .scaleLinear()
    .domain([
      d3.min(filtered_data, function (d) {
        return +d.valuenum;
      }),
      d3.max(filtered_data, function (d) {
        return +d.valuenum;
      }),
    ])
    .range([height - 5, 0]);
  svg
    .append("g")
    .attr("stroke", "white")
    .call(d3.axisLeft(y))
    .selectAll("path")
    .style("stroke", "white");
  svg.selectAll(".tick line").style("stroke", "white");

  const o2_line = d3
    .line()
    .x((d) => x(d.charttime))
    .y((d) => y(d.valuenum))
    .curve(d3.curveMonotoneX);

  svg
    .selectAll("path.line")
    .data([filtered_data], (d) => d.charttime)
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "line")
          .attr("fill", "none")
          .attr("stroke", "white")
          .attr("stroke-width", 1)
          .attr("d", o2_line)
          .attr("stroke-dasharray", function () {
            const length = this.getTotalLength();
            return `${length} ${length}`;
          })
          .attr("stroke-dashoffset", function () {
            return this.getTotalLength();
          })

          .transition()
          .duration(15000)
          .attr("stroke-dashoffset", 0),

      (update) =>
        update
          .attr("stroke", "black")
          .transition()
          .duration(5000)
          .attr("d", o2_line),

      (exit) =>
        exit
          .attr("stroke", "brown")
          .transition()
          .duration(1000)
          .attr("stroke-dashoffset", function () {
            return -this.getTotalLength();
          })
          .remove()
    );

  function getValuenumForTime(time) {
    const closest = filtered_data.reduce((prev, curr) => {
      return Math.abs(curr.charttime - time) < Math.abs(prev.charttime - time)
        ? curr
        : prev;
    });
    return closest.valuenum;
  }

  setTimeout(() => {
    svg
      .selectAll("circle.data-point")
      .data(medications_data, (d1) => d1.starttime)
      .join((enter) =>
        enter
          .append("circle")
          .attr("class", "data-point")
          .attr("r", 5)
          .attr("fill", (d1) => color_scale(d1.ordercategoryname))
          .attr("cx", (d1) => x(d1.starttime))
          .attr("cy", (d1) => {
            const matchingValuenum = getValuenumForTime(d1.starttime);
            return matchingValuenum ? y(matchingValuenum) : null;
          })
          .style("opacity", 0)
          .transition()

          .duration(1000)
          .style("opacity", 1)
      )
      .on("mouseover", function (event, d1) {
        const tooltipLine = d3.select('#tooltipLine');
          tooltipLine.transition().duration(200).style('opacity', 1);
          tooltipLine.html(d1.ordercategoryname.substring(3))
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })

      .on("mousemove", function (event) {
        d3.select('#tooltipLine')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
      })

      .on("mouseout", function (event) {
        d3.select('#tooltipLine').transition().duration(500).style('opacity', 0);
      })
      .attr("class", (d1) =>
        color_scale(d1.ordercategoryname) ? "meds-circle" : " "
      );
  }, 15000);



  const o2_click = svg
    .selectAll("oxygen_circle")
    .data(filtered_data)
    .enter()
    .append("circle")
    .attr("fill", "blue")
    //.attr("opacity",0)
    .attr("r", 3)

    .attr("cx", (d) => x(d.charttime))
    .attr("cy", (d) => y(d.valuenum));
  o2_click.on("mouseover", function (event, d) {
    d3.select(this)
      .transition()
      .duration(10)
      .attr("r", 4)
      .attr("fill", "cyan")

      .transition()
      .duration(2000)
      .attr("r", 3)
      .attr("fill", "blue");
  });
  o2_click.on("click", function (event, d) {
    d3.select("#oxygen_value").text(d.valuenum);
  });
}

function drawRespChart() {
  var margin = { top: 20, right: 50, bottom: 20, left: 60 },
    width = 800 - margin.left - margin.right, 
    height = 175 - margin.top - margin.bottom; 
  const filtered_data = selected_data
    .filter((data) => data["item_id"] == 220179 || data["item_id"] == 220180)

    .sort((a, b) => new Date(a["charttime"]) - new Date(b["charttime"]));
  // console.log("Resp_Chart Filtered Data: ", filtered_data);
  d3.select("#syst_value").text(filtered_data[0].valuenum);
  d3.select("#dias_value").text(filtered_data[1].valuenum);

  //console.log(d3.extent(filtered_data, function(d) { return d.charttime; }));

  var svg = d3.select("#bp_chart");
  svg.selectAll("*").remove();
  svg = svg
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3
    .scaleTime()
    .domain(
      d3.extent(filtered_data, function (d) {
        return d.charttime;
      })
    )
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(-10," + height + ")")
    .attr("stroke", "white")
    .call(d3.axisBottom(x))
    .selectAll("path")
    .style("stroke", "white");
  svg.selectAll(".tick line").style("stroke", "white");

  var y = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(filtered_data, function (d) {
        return +d.valuenum;
      }),
    ])

    .range([height, 0]);
  svg
    .append("g")
    .attr("transform", `translate(-10)`)
    .attr("stroke", "white")
    .call(d3.axisLeft(y))
    .selectAll("path")
    .style("stroke", "white");
  svg.selectAll(".tick line").style("stroke", "white");

  const resp_line = d3
    .line()
    .x((d) => x(d.charttime))
    .y((d) => y(d.valuenum))
    .curve(d3.curveMonotoneX);

  svg
    .selectAll("path.line")
    .data([filtered_data], (d) => d.charttime)
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "line")
          .attr("fill", "none")
          .attr("stroke", "white")
          .attr("stroke-width", 1)
          .attr("d", resp_line)
          .attr("stroke-dasharray", function () {
            const length = this.getTotalLength();
            return `${length} ${length}`;
          })
          .attr("stroke-dashoffset", function () {
            return this.getTotalLength();
          })

          .transition()
          .duration(15000)
          .attr("stroke-dashoffset", 0),

      (update) =>
        update
          .attr("stroke", "black")
          .transition()
          .duration(5000)
          .attr("d", resp_line),

      (exit) =>
        exit
          .attr("stroke", "brown")
          .transition()
          .duration(1000)
          .attr("stroke-dashoffset", function () {
            return -this.getTotalLength();
          })
          .remove()
    );

  function getValuenumForTime(time) {
    const closest = filtered_data.reduce((prev, curr) => {
      return Math.abs(curr.charttime - time) < Math.abs(prev.charttime - time)
        ? curr
        : prev;
    });
    return closest.valuenum;
  }

  setTimeout(() => {
    svg
      .selectAll("circle.data-point")
      .data(medications_data, (d1) => d1.starttime)
      .join((enter) =>
        enter
          .append("circle")
          .attr("class", "data-point")
          .attr("r", 5)
          .attr("fill", (d1) => color_scale(d1.ordercategoryname))
          .attr("cx", (d1) => x(d1.starttime))
          .attr("cy", (d1) => {
            const matchingValuenum = getValuenumForTime(d1.starttime);
            return matchingValuenum ? y(matchingValuenum) : null;
          })
          .style("opacity", 0)
          .filter(function (d1) {
            const x_position = x(d1.starttime);
            return x_position >= 0 && x_position <= width;
          })
          .transition()

          .duration(1000)
          .style("opacity", 1)
      )
      .on("mouseover", function (event, d1) {
        const tooltipLine = d3.select('#tooltipLine');
          tooltipLine.transition().duration(200).style('opacity', 1);
          tooltipLine.html(d1.ordercategoryname.substring(3))
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 30) + 'px');
      })

      .on("mousemove", function (event) {
        d3.select('#tooltipLine')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
      })

      .on("mouseout", function (event) {
        d3.select('#tooltipLine').transition().duration(500).style('opacity', 0);
      })
      .attr("class", (d1) =>
        color_scale(d1.ordercategoryname) ? "meds-circle" : " "
      );
  }, 15000);


  const resp_click = svg
    .selectAll("resp_circle")
    .data(filtered_data)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.charttime))
    .attr("cy", (d) => y(d.valuenum))
    .attr("fill", "blue")
    .attr("r", "3");

  resp_click.on("mouseover", function (event, d) {
    if (d.item_id == 220179) {
      d3.select(this)
        .transition()
        .duration(10)
        .attr("r", 4)
        .attr("fill", "cyan")
        .transition()
        .duration(2000)
        .attr("r", 3)
        .attr("fill", "blue");
    }

    if (d.item_id == 220180) {
      d3.select(this)
        .transition()
        .duration(10)
        .attr("r", 4)
        .attr("fill", "cyan")
        .transition()
        .duration(2000)
        .attr("r", 3)
        .attr("fill", "blue");
    }
  });
  resp_click.on("click", function (event, d) {
    if (d.item_id == 220179) {
      d3.select("#syst_value").text(d.valuenum);
    }

    if (d.item_id == 220180) {
      d3.select("#dias_value").text(d.valuenum);
    }
  });
}

window.addEventListener('page8Active', function() {
  drawHeartChart()
  drawOxygenChart()
  drawRespChart()
}); 
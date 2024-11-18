let nodes_arr = [];
let links_arr = [];
let journeySankey;

class Nodes {
  constructor(id) {
    this.id = id;
  }
}
class Link {
  constructor(source, target, value) {
    this.source = source;
    this.target = target;
    this.value = value;
  }
}
collectData1();

function createCurvedPath1(link) {
  const sourceNode = nodes_arr.find((node) => node.id === link.source);
  const targetNode = nodes_arr.find((node) => node.id === link.target);

  const sx = sourceNode.x;
  const sy = sourceNode.y;
  const tx = targetNode.x;
  const ty = targetNode.y;

  if (link.source === "Admit" && link.target === "Emergency Department") {
    const offsetX = 600;
    return `M${sx},${sy + 150} L${sx - offsetX},${sy + 150} L${sx - offsetX},${
      ty + 200
    }  }`;
  } else if (
    (link.source === "Admit" && link.target === "Care Units") ||
    (link.source === "Care Units" && link.target === "Discharge")
  ) {
    const offsetY = 150;
    return `M${sx + offsetY},${sy}  L${sx + offsetY},${ty + 200}  }`;
  } else if (
    link.source === "Emergency Department" &&
    link.target === "Care Units"
  ) {
    const offsetX = 600;
    return `M${sx + 300},${sy + 50}  L${sx + 750},${sy + 50}  }`;
  }
  const offsetX = 600;
  return `M${sx},${sy + 50} L${sx - offsetX},${sy + 50} L${sx - offsetX},${
    ty + 200
  }  }`;
}

function drawGraph() {
  const svg = d3.select("#networkSvg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");
  const centerX = width / 2 + 100;
  const centerY = height - 200;
  const radius = 200;

  nodes_arr.forEach((node, i) => {
    if (node.id === "Admit") {
      node.x = centerX;
      node.y = centerY;
    } else if (node.id == "Emergency Department") {
      node.x = centerX - 750;
      node.y = centerY - 200;
    } else if (node.id == "Care Units") {
      node.x = centerX;
      node.y = centerY - 300;
    } else if (node.id == "Dead") {
      node.x = centerX - 750;
      node.y = centerY - 600;
    } else if (node.id == "Discharge") {
      node.x = centerX;
      node.y = centerY - 600;
    }
  });
  //   console.log(nodes_arr);
  //   console.log(links_arr);
  originalStrokeWidth = 1;
  const thicknessScale = d3
    .scaleLinear()
    .domain(d3.extent(links_arr, (d) => d.value))
    .range([15, 100]);

  const node = svg
    .append("g")
    .selectAll("rect")
    .data(nodes_arr)
    .join("rect")
    .attr("class", "node")
    .attr("width", 300)
    .attr("height", 200)
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y)
    .style("fill", "#666666")
    .attr("rx", 50)
    .attr("ry", 50);

  const labels = svg
    .append("g")
    .selectAll("text")
    .data(nodes_arr)
    .join("text")
    .attr("class", "node-label")
    .attr("x", (d) => d.x + 150) // Centering the label horizontally
    .attr("y", (d) => d.y + 100) // Centering the label vertically
    .attr("text-anchor", "middle")
    .attr("dy", ".35em")
    .style("fill", "#ffffff")
    .style("font-size", "24px")
    .text((d) => d.id);

  var div = d3
    .select("body")
    .append("div")
    .attr("class", "tooltipNetwork")
    .style("opacity", 0);

  const links = svg
    .selectAll(".link")
    .data(links_arr)
    .join("path")
    .attr("class", "link")
    .attr("d", (d) => {
      //   console.log(d);
      return createCurvedPath1(d);
    })
    .attr("stroke-width", 1)
    .attr("marker-end", "url(#arrow)")
    .on("mouseover", function (event, d) {
      // console.log('ín here!')
    })
    .on("mousemove", function (event, d) {
      div.transition().duration(100).style("opacity", 0.9);
      div
        .html(
          `${d.value} patients are transferred from ${d.source} to ${d.target}`
        )
        .style("left", event.pageX - 20 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      div.transition().duration(500).style("opacity", 0);
    });
  links_arr.forEach((link) => {
    const path = svg
      .selectAll(".link")
      .filter((d) => d === link)
      .node();
    const pathLength = path.getTotalLength();

    let further_delay = 0;
    // if (link.source == "Care Units") {
    //   further_delay = 18000;
    // }

    for (let i = 0; i < link.value; i++) {
      const circle = svg.append("circle").attr("class", "flow-circle");

      function animateCircle() {
        svg
          .selectAll(".link")
          .filter((d) => d === link)
          .transition()
          .duration(d=>{
            if (link.source === "Admit" && link.target === "Emergency Department" || link.source === "Emergency Department" && link.target === "Care Units") {
             return 120 ;
            } 
            else if (link.source === "Admit" && link.target === "Care Units"){
              return 558.79;
            }else if(link.source === "Care Units" && link.target === "Discharge"){
              return 100;
            }
            return 10000;
          })
          .delay(further_delay + i * 100)
          .attr("stroke-width", thicknessScale(i));
        circle
          .transition()
          .delay(d=>{
            if (link.source === "Admit" && link.target === "Emergency Department" || link.source === "Emergency Department" && link.target === "Care Units") {
              return i*143;
             } 
             else if (link.source === "Admit" && link.target === "Care Units"){
              return i*275;
             }else if(link.source === "Care Units" && link.target === "Discharge"){
              return i*100;
             }
            return i * 1150})
          .duration(d=>{
            if (link.source === "Admit" && link.target === "Emergency Department" || link.source === "Emergency Department" && link.target === "Care Units") {
             return 120;
            } 
            else if (link.source === "Admit" && link.target === "Care Units"){
              return 558.79;
            }else if(link.source === "Care Units" && link.target === "Discharge"){
              return 100;
            }
            return 10000;
          })
          .ease(d3.easeLinear)
          .attrTween("transform", () => {
            return (t) => {
              const point = path.getPointAtLength(t * pathLength);
              return `translate(${point.x},${point.y})`;
            };
          });
      }

      animateCircle();
    }
  });
}

function collectData1() {
  const transfers_path = "/Dataset/hospital/transfers.csv";
  const admissions_path = "/Dataset/hospital/admissions.csv";
  let set_of_dead = new Set();

  const freqMap = new Map();
  const nodes = new Set();
  let node_id = 0;
  const nodes_str = new Set();
  d3.csv(admissions_path).then((data) => {
    set_of_dead = data.filter((d) => d.deathtime).map((d) => d.hadm_id);

    d3.csv(transfers_path).then((data) => {
      data = data.filter((d) => d.hadm_id);

      const groupedData = d3.group(data, (d) => d.hadm_id);
      groupedData.forEach((values, key) => {
        values.sort((a, b) => new Date(a.intime) - new Date(b.intime));

        values.forEach((row, index) => {
          if (index < values.length - 1) {
            const hadm_id = row.hadm_id;

            const current_type = row.eventtype;
            const next_type = values[index + 1].eventtype;
            const current_cu = row.careunit;
            const next_cu = values[index + 1].careunit;
            let curr_group;
            let next_group;
            if (current_type == "admit") {
              curr_group = "Admit";
            }
            if (current_type == "discharge") {
              curr_group = "Discharge";
            }
            if (current_type == "ED") {
              curr_group = "Emergency Department";
            } else if (current_type == "transfer") {
              curr_group = "Care Units";
            }
            if (next_type === "admit") {
              next_group = "Admit";
            } else if (next_type === "discharge") {
              if (set_of_dead.includes(hadm_id)) {
                next_group = "Dead";
              } else {
                next_group = "Discharge";
              }
            } else if (next_type === "ED") {
              next_group = "Emergency Department";
            } else {
              next_group = "Care Units";
            }

            if (!nodes_str.has(curr_group)) {
              nodes.add(new Nodes(curr_group));
              node_id += 1;
            }
            if (!nodes_str.has(next_group)) {
              nodes.add(new Nodes(next_group));
              node_id += 1;
            }
            nodes_str.add(curr_group);
            nodes_str.add(next_group);
            if (curr_group != next_group) {
              const mapping = curr_group + "#" + next_group;

              freqMap.set(mapping, (freqMap.get(mapping) || 0) + 1);
            }
          }
        });
      });
      links_arr.push(new Link("Admit", "Care Units", 93));
      let directlyDead = 0;
      let directlyDischarged = 0;
      freqMap.forEach((value, key) => {
        let curr = key.split("#")[0];
        let next = key.split("#")[1];
        if (curr == "Admit" && next == "Dead") {
          directlyDead = value;
        } else if (curr == "Admit" && next == "Discharge") {
          directlyDischarged = value;
        } else {
          if (curr == "Emergency Department") {
            curr = "Admit";
          } else if (curr == "Admit") {
            curr = "Emergency Department";
          }
          if (next == "Emergency Department") {
            next = "Admit";
          } else if (next == "Admit") {
            next = "Emergency Department";
          }
          if (curr == "Emergency Department") {
            value += 6;
          }
          links_arr.push(new Link(curr, next, value));
        }
      });

      nodes_arr = [...nodes];
      nodes_arr.sort((a, b) => {
        const order = [
          "Emergency Department",
          "Admit",
          "Care Units",
          "Discharge",
          "Dead",
        ];
        return order.indexOf(a.id) - order.indexOf(b.id);
      });

      for (let i = 0; i < links_arr.length; i++) {
        const link = links_arr[i];
        if (link.source == "Care Units" && link.target == "Dead") {
          link.value = link.value + directlyDead;
        } else if (link.source == "Care Units" && link.target == "Discharge") {
          link.value = link.value + directlyDischarged;
        }
      }
      drawGraph();
    });
  });
}

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
document.addEventListener("DOMContentLoaded", function () {
  collectData1();
});

function createCurvedPath1(link) {
  const sourceNode = nodes_arr.find((node) => node.id === link.source);
  const targetNode = nodes_arr.find((node) => node.id === link.target);

  const sx = sourceNode.x;
  const sy = sourceNode.y;
  const tx = targetNode.x;
  const ty = targetNode.y;

  if (link.source === "Admit" && link.target === "ICU") {
    const offsetX = 600;
    return `M${sx},${sy + 75} L${sx - offsetX},${sy + 75} L${sx - offsetX},${
      ty + 150
    }  }`;
  } else if (
    (link.source === "Admit" && link.target === "Care Units") ||
    (link.source === "Care Units" && link.target === "Discharge")
  ) {
    const offsetY = 150;
    return `M${sx + offsetY},${sy}  L${sx + offsetY},${ty + 150}  }`;
  } else if (link.source === "ICU" && link.target === "Care Units") {
    const offsetX = 600;
    return `M${sx + 300},${sy + 50}  L${sx + 750},${sy + 50}  }`;
  }
  const offsetX = 600;
  return `M${sx},${sy + 25} L${sx - offsetX},${sy + 25} L${sx - offsetX},${
    ty + 150
  }  }`;
}

function drawGraph() {
  const svg = d3.select("#networkSvg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");
  const centerX = width / 2 + 250;
  const centerY = height - 175;
  const radius = 200;

  nodes_arr.forEach((node, i) => {
    if (node.id === "Admit") {
      node.x = centerX;
      node.y = centerY;
      node.imageUrl = "./images/patient_icon.png";
    } else if (node.id == "ICU") {
      node.x = centerX - 750;
      node.y = centerY - 200;
      node.imageUrl = "./images/hospitalization.png";
    } else if (node.id == "Care Units") {
      node.x = centerX;
      node.y = centerY - 250;
      node.imageUrl = "./images/hospitalisation.png";
    } else if (node.id == "Dead") {
      node.x = centerX - 750;
      node.y = centerY - 500;
      node.imageUrl = "./images/patient.png";
    } else if (node.id == "Discharge") {
      node.x = centerX;
      node.y = centerY - 500;
      node.imageUrl = "./images/discharge.png";
    }
  });
  originalStrokeWidth = 1;
  const thicknessScale = d3
    .scaleLinear()
    .domain(d3.extent(links_arr, (d) => d.value))
    .range([15, 100]);

    const defs = svg.append("defs");  
    defs.append("filter")
        .attr("id", "drop-shadow")  
        .attr("x", "-50%")  
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%")
      .append("feDropShadow")
        .attr("dx", "5")  
        .attr("dy", "5")  
        .attr("stdDeviation", "10")  
        .attr("flood-color", "rgba(0, 0, 0, 0.3)");  

  const node = svg
    .append("g")
    .selectAll("rect")
    .data(nodes_arr)
    .join("rect")
    .attr("class", "node")
    .attr("width", 300)
    .attr("height", 150)
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y)
    .style("fill", "#B3CDE3")
    .style("stroke-width", "2px")
    .style("stroke", "#b3c7c6")
    .attr("rx", 20)
    .attr("ry", 20)
    .style("filter", "url(#drop-shadow)");;

  const labels = svg
    .append("g")
    .selectAll("text")
    .data(nodes_arr)
    .join("text")
    .attr("class", "node-label")
    .attr("x", (d) => d.x + 150)
    .attr("y", (d) => d.y + 75)
    .attr("text-anchor", "middle")
    .attr("dy", ".35em")
    .style("fill", "#000000")
    .style("font-size", "24px")
    .text((d) => d.id);

  const image = svg
    .append("g")
    .selectAll("image")
    .data(nodes_arr)
    .join("image")
    .attr("x", (d) => {
      if(d.id=="ICU" || d.id=="Dead" || d.id == "Admit"){
        return d.x + 190;
      }
      return d.x + 220
    })
    .attr("y", (d) => d.y + 50)
    .attr("width", 50)
    .attr("height", 50)
    .attr("href", (d) => d.imageUrl)
    .attr("opacity", 1);
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
      return createCurvedPath1(d);
    })
    .style("stroke", "#b3c7c6")
    .attr("stroke-width", 1)
    .attr("marker-end", "url(#arrow)")
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

    for (let i = 0; i < link.value; i++) {
      const circle = svg.append("circle").attr("class", "flow-circle");

      function animateCircle() {
        svg
          .selectAll(".link")
          .filter((d) => d === link)
          .transition()
          .duration((d) => {
            if (
              (link.source === "Admit" && link.target === "ICU") ||
              (link.source === "ICU" && link.target === "Care Units")
            ) {
              return 120;
            } else if (
              link.source === "Admit" &&
              link.target === "Care Units"
            ) {
              return 558.79;
            } else if (
              link.source === "Care Units" &&
              link.target === "Discharge"
            ) {
              return 100;
            }
            return 10000;
          })
          .delay(further_delay + i * 100)
          .attr("stroke-width", thicknessScale(i));
        circle
          .transition()
          .delay((d) => {
            if (
              (link.source === "Admit" && link.target === "ICU") ||
              (link.source === "ICU" && link.target === "Care Units")
            ) {
              return i * 143;
            } else if (
              link.source === "Admit" &&
              link.target === "Care Units"
            ) {
              return i * 275;
            } else if (
              link.source === "Care Units" &&
              link.target === "Discharge"
            ) {
              return i * 100;
            }
            return i * 1150;
          })
          .duration((d) => {
            if (
              (link.source === "Admit" && link.target === "ICU") ||
              (link.source === "ICU" && link.target === "Care Units")
            ) {
              return 120;
            } else if (
              link.source === "Admit" &&
              link.target === "Care Units"
            ) {
              return 558.79;
            } else if (
              link.source === "Care Units" &&
              link.target === "Discharge"
            ) {
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
              curr_group = "ICU";
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
              next_group = "ICU";
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
          if (curr == "ICU") {
            curr = "Admit";
          } else if (curr == "Admit") {
            curr = "ICU";
          }
          if (next == "ICU") {
            next = "Admit";
          } else if (next == "Admit") {
            next = "ICU";
          }
          if (curr == "ICU") {
            value += 6;
          }
          links_arr.push(new Link(curr, next, value));
        }
      });

      nodes_arr = [...nodes];
      nodes_arr.sort((a, b) => {
        const order = ["ICU", "Admit", "Care Units", "Discharge", "Dead"];
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

const width = 1200; // Increased width
const height = 800; // Increased height
const margin = { top: 20, right: 20, bottom: 50, left: 70 };

const xScale = d3.scalePoint().range([margin.left-30, width-30 - margin.right]).padding(2);
const yScale = d3.scaleTime().range([margin.top + (height * 0.05) -10, height - margin.bottom - 20]); // Adjusted to start after 5% from top and leave space at bottom
const sizeScale = d3.scaleSqrt().range([5, 15]); // Adjusted to make bubbles smaller to fit within the chart area
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

const svg = d3.select("#bubbleSvg").attr("width", width).attr("height", height);
// Removed chartArea variable
// const chartArea = svg.select("#chartArea");
const tooltip = d3.select("#bubbleTooltip");
const detailsBox = d3.select("#detailsBox");
const legendContainer = d3.select("#legendContainer");

let inputEvents, dItems, dItemsMap;
let activeCircle = null;

// Load data
console.log("Loading data...");
Promise.all([
    d3.csv('./Dataset/icu/inputevents.csv'),
    d3.csv('./Dataset/icu/d_items.csv')
]).then(([inputEventsData, dItemsData]) => {
    inputEvents = inputEventsData;
    dItems = dItemsData;
    console.log("Data loaded successfully.");
    console.log("Input Events:", inputEvents);
    console.log("D_Items:", dItems);

    dItemsMap = new Map();
    dItems.forEach(d => {
        if (d.itemid) {
            dItemsMap.set(d.itemid, d.label || "Unknown");
        }
    });
    console.log("D_Items Map:", dItemsMap);

    const uniqueStayIds = [...new Set(inputEvents.map(d => d.stay_id))];
    const dropdown = d3.select("#stayDropdown");
    uniqueStayIds.forEach(stay_id => {
        dropdown.append("option").attr("value", stay_id).text(stay_id);
    });
    console.log("Unique Stay IDs added to dropdown:", uniqueStayIds);

    dropdown.on("change", function() {
        const selectedStayId = this.value;
        console.log("Dropdown changed, selected Stay ID:", selectedStayId);
        if (selectedStayId) {
            updateChart(selectedStayId);
        } else {
            svg.selectAll("circle").remove();
            legendContainer.selectAll(".legend").remove();
            console.log("Cleared chart.");
        }
    });

    d3.select("#timeRange").on("input", function() {
        const selectedStayId = dropdown.property("value");
        if (selectedStayId) {
            updateChart(selectedStayId);
        }
    });

    initializeChart(); // Call initializeChart after data is loaded
}).catch(error => {
    console.error("Error loading data:", error);
});

function updateChart(stayId) {
    console.log("Updating chart for Stay ID:", stayId);

    const filteredData = inputEvents.filter(d => d.stay_id === stayId);
    console.log("Filtered Data:", filteredData);

    const timeRangeValue = +d3.select("#timeRange").property("value");
    const minTime = d3.min(filteredData, d => new Date(d.starttime));
    const maxTime = d3.max(filteredData, d => new Date(d.endtime));
    const timeRange = d3.scaleTime()
        .domain([minTime, maxTime])
        .range([0, 100]);

    const filteredByTime = filteredData.filter(d => {
        const startTime = new Date(d.starttime);
        return timeRange(startTime) <= timeRangeValue;
    });
    console.log("Filtered by Time:", filteredByTime);

    const aggregatedData = d3.rollups(filteredByTime, v => {
        const firstEvent = v[0];
        return {
            frequency: v.length,
            order_category_name: firstEvent.ordercategoryname,
            times: v.map(d => ({
                starttime: new Date(d.starttime),
                endtime: new Date(d.endtime),
                amount: d.amount,
                amountuom: d.amountuom,
                rate: d.rate,
                rateuom: d.rateuom
            })).sort((a, b) => a.starttime - b.starttime) // Collect and sort times
        };
    }, d => d.itemid).map(([item_id, d]) => {
        const abbreviation = dItemsMap.get(String(item_id)) || "Unknown";
        return {
            item_id,
            abbreviation,
            order_category_name: d.order_category_name,
            frequency: d.frequency,
            times: d.times
        };
    });
    console.log("Aggregated Data:", aggregatedData);

    // Combine units for the same item
    const combinedData = d3.groups(aggregatedData, d => d.item_id).map(([item_id, values]) => {
        const combinedTimes = values.flatMap(d => d.times);
        return {
            item_id,
            abbreviation: values[0].abbreviation,
            order_category_name: values[0].order_category_name,
            frequency: combinedTimes.length,
            times: combinedTimes.sort((a, b) => a.starttime - b.starttime)
        };
    });
    console.log("Combined Data:", combinedData);

    const maxBubbleCount = 20;
    const bubbleCount = combinedData.length;
    console.log("Bubble Count:", bubbleCount);

    const availableWidth = width - margin.left - margin.right;
    const availableHeight = height - margin.top - margin.bottom;
    const maxBubbleSize = Math.min(availableWidth / bubbleCount, availableHeight / bubbleCount) / 2;

    sizeScale.range([5, Math.min(maxBubbleSize, 15)]); // Set a fixed maximum size for bubbles

    xScale.domain([...new Set(combinedData.map(d => d.order_category_name))]); // Set domain based on categories
    yScale.domain([minTime, maxTime]);
    console.log("X Scale Domain:", xScale.domain());
    console.log("Y Scale Domain:", yScale.domain());

    svg.selectAll("circle").remove();
    svg.selectAll("text.abbreviation").remove();

    const simulation = d3.forceSimulation(combinedData)
        .force("x", d3.forceX(d => xScale(d.order_category_name)).strength(1)) // Use category for x position
        .force("y", d3.forceY(d => yScale(d.times[0].starttime)).strength(1))
        .force("collide", d3.forceCollide(d => sizeScale(d.frequency) + 1).strength(1)) // Adjusted collision force radius
        .stop();

    for (let i = 0; i < 300; i++) simulation.tick();
    console.log("Simulation complete. Node positions updated.");

    const circles = svg.selectAll("circle")
        .data(combinedData);

    circles.enter()
        .append("circle")
        .attr("cx", d => xScale(d.order_category_name))
        .attr("cy", d => yScale(d.times[0].starttime))
        .attr("r", 0)
        .attr("fill", d => colorScale(d.order_category_name))
        .attr("opacity", 0.8)
        .on('mouseover', function(event, d) {
            if (activeCircle !== this) {
                const stats = `
                    <p><strong>Category:</strong> ${d.order_category_name}</p>
                    <p><strong>Product Description:</strong> ${d.abbreviation}</p>
                    <p><strong>Frequency:</strong> ${d.frequency}</p>
                    <p><strong>First Administration:</strong> ${d.times[0].starttime.toLocaleString()}</p>
                    <p><strong>Last Administration:</strong> ${d.times[d.times.length - 1].starttime.toLocaleString()}</p>
                `;
                tooltip.transition().duration(200).style('opacity', 1);
                tooltip.html(stats)
                    .style('left', (event.pageX + 15) + "px")
                    .style('top', (event.pageY - 30) + "px");
            }
        })
        .on('mouseout', function() {
            if (activeCircle !== this) {
                tooltip.transition().duration(500).style('opacity', 0);
            }
        })
        .on('click', function(event, d) {
            if (activeCircle === this) {
                // Restore circles
                svg.selectAll("circle")
                    .transition()
                    .duration(500)
                    .style("opacity", 0.8)
                    .attr("r", d => sizeScale(d.frequency))
                    .attr("stroke", "none");

                // Restore legend
                updateLegend(combinedData);

                // Hide details
                detailsBox.style('display', 'none');

                activeCircle = null;
            } else {
                // Dim other circles
                svg.selectAll("circle")
                    .filter(circleData => circleData !== d)
                    .transition()
                    .duration(500)
                    .style("opacity", 0.1);

                // Zoom in on the clicked circle
                d3.select(this)
                    .transition()
                    .duration(500)
                    .attr("r", sizeScale(d.frequency) * 2)
                    .attr("stroke", "blue")
                    .attr("stroke-width", 2);

                // Display detailed information
                const formattedTimes = d.times.map((time, index) => 
                    `${index + 1}. Start: ${time.starttime.toLocaleString()}<br>
                     End: ${time.endtime.toLocaleString()}<br>
                     Amount: ${time.amount} ${time.amountuom}<br>
                     Rate: ${time.rate} ${time.rateuom}`).join('<br><br>');
                const details = `
                    <p><strong>Order of Administration:</strong><br>${formattedTimes}</p>
                    <button id="closeDetails">Close</button>
                `;
                detailsBox.html(details)
                    .style('display', 'block');

                // Add close button functionality
                d3.select("#closeDetails").on("click", function() {
                    // Hide details
                    detailsBox.style('display', 'none');

                    // Restore circles
                    svg.selectAll("circle")
                        .transition()
                        .duration(500)
                        .style("opacity", 0.8)
                        .attr("r", d => sizeScale(d.frequency))
                        .attr("stroke", "none");

                    // Restore legend
                    updateLegend(combinedData);

                    activeCircle = null;
                });

                // Remove legend and disable tooltip
                legendContainer.selectAll(".legend").remove();
                tooltip.style('opacity', 0);

                activeCircle = this;
            }
        })
        .transition()
        .duration(1000)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => sizeScale(d.frequency));
    console.log("Circles drawn with animation.");

    // Update legend
    function updateLegend(data) {
        const categories = [...new Set(data.map(d => d.order_category_name))];
        const legend = legendContainer.selectAll(".legend")
            .data(categories);

        const legendEnter = legend.enter().append("div")
            .attr("class", "legend")
            .style("display", "flex")
            .style("align-items", "center")
            .style("margin-bottom", "5px");

        legendEnter.append("div")
            .style("width", "18px")
            .style("height", "18px")
            .style("background-color", d => colorScale(d))
            .style("margin-right", "5px")
            .style("cursor", "pointer")
            .on("click", function(event, d) {
                const isActive = d3.select(this).classed("active");
                d3.select(this).classed("active", !isActive);
                const opacity = isActive ? 0.8 : 0.2;
                svg.selectAll("circle")
                    .filter(circleData => circleData.order_category_name === d)
                    .transition()
                    .style("opacity", opacity);
            });

        legendEnter.append("span")
            .text(d => d);

        legend.exit().remove();
        console.log("Legend updated.");
    }

    updateLegend(combinedData);
}

// Correctly define initializeChart and attach it to the window object
window.initializeChart = function() {
    const firstStayId = d3.select("#stayDropdown option:nth-child(2)").property("value");
    if (firstStayId) {
        d3.select("#stayDropdown").property("value", firstStayId);
        updateChart(firstStayId);
    }
};

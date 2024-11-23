const width = 1200;
const height = 800;
const margin = { top: 20, right: 20, bottom: 50, left: 70 };
const maxRadius = 15;

const xScale = d3.scalePoint().range([margin.left - 30, width - 30 - margin.right]).padding(2);
const yScale = d3.scaleTime().range([margin.top + (height * 0.05) - 10, height - margin.bottom - 20]);
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

const svg = d3.select("#bubbleSvg").attr("width", width).attr("height", height);
const tooltip = d3.select("body").append("div")
    .attr("id", "bubbleTooltip")
    .attr("class", "bubble-tooltip")
    .style("opacity", 0);
const detailsBox = d3.select("#detailsBox");
const legendContainer = d3.select("#legendContainer");

let inputEvents, dItems, dItemsMap;
let activeCircle = null;

Promise.all([
    d3.csv('./Dataset/icu/inputevents.csv'),
    d3.csv('./Dataset/icu/d_items.csv')
]).then(([inputEventsData, dItemsData]) => {
    inputEvents = inputEventsData;
    dItems = dItemsData;

    dItemsMap = new Map();
    dItems.forEach(d => {
        if (d.itemid) {
            dItemsMap.set(d.itemid, d.label || "Unknown");
        }
    });

    const uniqueStayIds = [...new Set(inputEvents.map(d => d.stay_id))];
    const dropdown = d3.select("#stayDropdown").property("value", "overall");
    uniqueStayIds.forEach(stay_id => {
        dropdown.append("option").attr("value", stay_id).text(stay_id);
    });

    if (uniqueStayIds.length > 0) {
        const firstStayId = uniqueStayIds[0];
        dropdown.property("value", firstStayId);
        updateChart(firstStayId);
    } else {
        showOverallChart();
    }

    dropdown.on("change", function() {
        const selectedStayId = this.value;
        if (selectedStayId === "overall") {
            showOverallChart();
        } else {
            updateChart(selectedStayId);
        }
    });

    d3.select("#timeRange").on("input", function() {
        const selectedStayId = dropdown.property("value");
        if (selectedStayId) {
            updateChart(selectedStayId);
        }
    });

}).catch(error => {
    console.error("Error loading data:", error);
});

function updateChart(stayId) {
    if (!stayId || stayId === "overall") {
        showOverallChart();
        return;
    }
    const filteredData = inputEvents.filter(d => d.stay_id === stayId);
    const timeRangeValue = +d3.select("#timeRange").property("value");
    const minTime = d3.min(filteredData, d => new Date(d.starttime));
    const maxTime = d3.max(filteredData, d => new Date(d.endtime));
    const timeRange = d3.scaleTime().domain([minTime, maxTime]).range([0, 100]);

    const filteredByTime = filteredData.filter(d => {
        const startTime = new Date(d.starttime);
        return timeRange(startTime) <= timeRangeValue;
    });

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
            })).sort((a, b) => a.starttime - b.starttime)
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

    const maxBubbleCount = 20;
    const bubbleCount = combinedData.length;
    const availableWidth = width - margin.left - margin.right;
    const availableHeight = height - margin.top - margin.bottom;
    const maxBubbleSize = Math.min(availableWidth / bubbleCount, availableHeight / bubbleCount) / 2;

    const sizeScale = d3.scaleSqrt().range([5, Math.min(maxBubbleSize, 15)]);

    xScale.domain([...new Set(combinedData.map(d => d.order_category_name))]);
    yScale.domain([minTime, maxTime])
          .range([height - margin.bottom - maxRadius, margin.top + maxRadius]);

    svg.selectAll("circle").remove();
    svg.selectAll("text.abbreviation").remove();

    xScale.range([margin.left + maxRadius, width - margin.right - maxRadius]);
    yScale.range([margin.top + maxRadius, height - margin.bottom - maxRadius]);

    const simulation = d3.forceSimulation(combinedData)
        .force("x", d3.forceX(d => xScale(d.order_category_name)).strength(1))
        .force("y", d3.forceY(d => {
            const timePosition = yScale(d.times[0].starttime);
            return Math.max(margin.top + maxRadius, 
                   Math.min(height - margin.bottom - maxRadius, timePosition));
        }).strength(1))
        .force("collide", d3.forceCollide(d => sizeScale(d.frequency) + 1).strength(1))
        .force("boundary", function() {
            for (let node of combinedData) {
                const r = sizeScale(node.frequency);
                node.x = Math.max(margin.left + r, Math.min(width - margin.right - r, node.x));
                node.y = Math.max(margin.top + r, Math.min(height - margin.bottom - r, node.y));
            }
        })
        .stop();

    for (let i = 0; i < 500; i++) simulation.tick();

    const circles = svg.selectAll("circle")
        .data(combinedData);

    circles.enter()
        .append("circle")
        .attr("cx", d => xScale(d.order_category_name))
        .attr("cy", d => yScale(d.times[0].starttime))
        .attr("r", 0)
        .attr("fill", d => colorScale(d.order_category_name))
        .attr("opacity", 0.8)
        .attr("class", d => `category-${d.order_category_name.replace(/\s+/g, '-')}`)
        .on('mouseover', function(event, d) {
            if (activeCircle !== this) {
                d3.select(this)
                    .attr('stroke', '#000')
                    .attr('stroke-width', 2);
                
                const firstTime = d.times[0].starttime.toLocaleString();
                const lastTime = d.times[d.times.length - 1].starttime.toLocaleString();
                
                const stats = `
                    <div class="tooltip-content">
                        <p><strong>Category:</strong> ${d.order_category_name}</p>
                        <p><strong>Product:</strong> ${d.abbreviation}</p>
                        <p><strong>Administrations:</strong> ${d.frequency}</p>
                        <p><strong>First:</strong> ${firstTime}</p>
                        <p><strong>Last:</strong> ${lastTime}</p>
                    </div>
                `;

                const tooltipWidth = 200;
                const tooltipHeight = 150;
                
                let xPosition = event.pageX + 15;
                let yPosition = event.pageY - 30;
                
                if (xPosition + tooltipWidth > window.innerWidth) {
                    xPosition = event.pageX - tooltipWidth - 15;
                }
                
                if (yPosition + tooltipHeight > window.innerHeight) {
                    yPosition = event.pageY - tooltipHeight - 15;
                }

                tooltip
                    .style('opacity', 1)
                    .style('left', `${xPosition}px`)
                    .style('top', `${yPosition}px`)
                    .html(stats);
            }
        })
        .on('mouseout', function() {
            if (activeCircle !== this) {
                d3.select(this).attr('stroke', null);
                tooltip.style('opacity', 0);
            }
        })
        .on('click', function(event, d) {
            if (activeCircle === this) {
                svg.selectAll("circle")
                    .transition()
                    .duration(500)
                    .style("opacity", 0.8)
                    .attr("r", d => sizeScale(d.frequency))
                    .attr("stroke", "none");

                updateLegend(combinedData);
                detailsBox.style('display', 'none');
                activeCircle = null;
            } else {
                svg.selectAll("circle")
                    .filter(circleData => circleData !== d)
                    .transition()
                    .duration(500)
                    .style("opacity", 0.1);

                d3.select(this)
                    .transition()
                    .duration(500)
                    .attr("r", sizeScale(d.frequency) * 2)
                    .attr("stroke", "blue")
                    .attr("stroke-width", 2);

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

                d3.select("#closeDetails").on("click", function() {
                    detailsBox.style('display', 'none');
                    svg.selectAll("circle")
                        .transition()
                        .duration(500)
                        .style("opacity", 0.8)
                        .attr("r", d => sizeScale(d.frequency))
                        .attr("stroke", "none");

                    updateLegend(combinedData);
                    activeCircle = null;
                });

                legendContainer.selectAll(".legend").remove();
                tooltip.style('opacity', 0);
                activeCircle = this;
            }
        })
        .transition()
        .duration(1000)
        .attr("cx", d => Math.max(margin.left + sizeScale(d.frequency), 
                        Math.min(width - margin.right - sizeScale(d.frequency), d.x)))
        .attr("cy", d => Math.max(margin.top + sizeScale(d.frequency), 
                        Math.min(height - margin.bottom - sizeScale(d.frequency), d.y)))
        .attr("r", d => sizeScale(d.frequency));

    updateLegend(combinedData);
}

function showOverallChart() {
    const aggregatedData = d3.rollups(inputEvents, v => v.length, d => d.itemid).map(([item_id, frequency]) => {
        const abbreviation = dItemsMap.get(String(item_id)) || "Unknown";
        const matchingEvent = inputEvents.find(d => d.itemid === item_id);
        const order_category_name = matchingEvent ? matchingEvent.ordercategoryname : "Unknown";
        return {
            item_id,
            abbreviation,
            order_category_name,
            frequency,
        };
    });

    const sizeScale = d3.scaleSqrt().range([2, 4]);

    svg.selectAll("circle").remove();
    svg.selectAll("text.abbreviation").remove();

    const simulation = d3.forceSimulation(aggregatedData)
        .force("x", d3.forceX(width / 2).strength(0.05))
        .force("y", d3.forceY(height / 2).strength(0.05))
        .force("collide", d3.forceCollide(d => sizeScale(d.frequency) + 1).strength(2))
        .stop();

    for (let i = 0; i < 300; i++) simulation.tick();

    const circles = svg.selectAll("circle")
        .data(aggregatedData);

    circles.enter()
        .append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 0)
        .attr("fill", d => colorScale(d.order_category_name))
        .attr("opacity", 0.8)
        .on('mouseover', function(event, d) {
            const stats = `
                <p><strong>Category:</strong> ${d.order_category_name}</p>
                <p><strong>Product Description:</strong> ${d.abbreviation}</p>
                <p><strong>Frequency:</strong> ${d.frequency}</p>
            `;
            tooltip.transition().duration(200).style('opacity', 1);
            tooltip.html(stats)
                .style('left', (event.pageX + 15) + "px")
                .style('top', (event.pageY - 30) + "px");
        })
        .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        })
        .transition()
        .duration(1000)
        .attr("r", d => sizeScale(d.frequency));

    updateLegend(aggregatedData);
}

function updateLegend(data) {
    if (!data || !Array.isArray(data)) {
        console.warn('Invalid data passed to updateLegend');
        return;
    }

    const categories = Array.from(new Set(data.map(d => d.order_category_name || "Unknown"))).sort();
    
    legendContainer.selectAll("*").remove();
    
    if (categories.length === 0) {
        console.warn('No categories found in data');
        return;
    }
    
    const legendItems = legendContainer
        .selectAll(".legend-item")
        .data(categories)
        .enter()
        .append("div")
        .attr("class", "legend-item")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "5px")
        .style("cursor", "pointer");

    legendItems
        .append("div")
        .style("width", "18px")
        .style("height", "18px")
        .style("background-color", d => colorScale(d))
        .style("margin-right", "5px")
        .style("border", "1px solid #ccc");

    legendItems
        .append("span")
        .text(d => d);

    legendItems.on("click", function(event, category) {
        const item = d3.select(this);
        const isActive = !item.classed("inactive");
        
        item.classed("inactive", isActive);
        item.select("div").style("opacity", isActive ? 0.3 : 1);
        
        svg.selectAll("circle")
            .filter(d => d.order_category_name === category)
            .style("opacity", isActive ? 0.2 : 0.8)
            .style("pointer-events", isActive ? "none" : "all");
    });

    legendItems.each(function(category) {
        const count = data.filter(d => d.order_category_name === category).length;
        d3.select(this).append("span")
            .text(` (${count})`)
            .style("margin-left", "5px")
            .style("color", "#666");
    });
}

function resetVisualization() {
    svg.selectAll("circle")
        .style("opacity", 0.8)
        .style("pointer-events", "all");
    
    legendContainer.selectAll(".legend-item")
        .classed("inactive", false)
        .select("div")
        .style("opacity", 1);
        
    if (activeCircle) {
        activeCircle = null;
        detailsBox.style('display', 'none');
    }
}

d3.select("#resetButton").on("click", resetVisualization);

d3.select("#timeRange").on("input", function() {
    const selectedStayId = d3.select("#stayDropdown").property("value");
    if (selectedStayId) {
        resetVisualization();
        updateChart(selectedStayId);
    }
});

const styleSheet = document.createElement('style');
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
`;
document.head.appendChild(styleSheet);


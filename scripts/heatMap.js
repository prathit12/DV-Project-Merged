
d3.csv('Dataset/Processed/final_data_heatmap.csv').then(function(data) {
    const tooltip = d3.select("#tooltip");

    data.forEach(d => {
    d.surgery_type_index = +d.surgery_type_index; // Convert to number
    d.hospital_expire_flag = +d.hospital_expire_flag; // Convert to number
    d.severity_level = +d.severity_level; // Convert to number
    });

    let sortBy = "dead";
    let filterBy = "all";
    let filterChanged = true;

    const procedures = [
    "cardiovascular",
    "kidney",
    "gastrointestinal",
    "musculoskeletal",
    "respiratory",
    "neurological",
    "others"
    ];

    function filterData() {
    return data.filter(d => {
        if (filterBy === "low" && (d.severity_level < 1 || d.severity_level > 3)) return false;
        if (filterBy === "medium" && (d.severity_level < 4 || d.severity_level > 6)) return false;
        if (filterBy === "high" && (d.severity_level < 7 || d.severity_level > 10)) return false;
        return true;
    });
    }

    function renderHeatmap(filteredData) {
    const categoryData = Array.from({ length: 7 }, (_, i) => ({ index: i, alive: 0, dead: 0 }));

    filteredData.forEach(d => {
        const surgeryType = +d.surgery_type_index;
        const expireFlag = +d.hospital_expire_flag;

        if (surgeryType >= 0 && surgeryType < 7) {
        if (expireFlag === 0) {
            categoryData[surgeryType].alive += 1;
        } else {
            categoryData[surgeryType].dead += 1;
        }
        }
    });

    categoryData.sort((a, b) => b[sortBy] - a[sortBy]);

    d3.select("#heatmap").selectAll(".cell").remove();
    d3.select(".x-axis-labels").selectAll("div").remove();

    const maxAlive = d3.max(categoryData, d => d.alive) || 0;
    const maxDead = d3.max(categoryData, d => d.dead) || 0;

    if (filterChanged) {
        d3.select("#aliveScale svg").html("");
        d3.select("#deadScale svg").html("");
        d3.select("#aliveMax").text(maxAlive);
        d3.select("#deadMax").text(maxDead);

        const aliveGradient = d3.select("#aliveScale svg")
        .append("defs")
        .append("linearGradient")
        .attr("id", "aliveGradient")
        .attr("x1", "0%")
        .attr("x2", "100%");
        aliveGradient.selectAll("stop")
        .data(d3.range(0, 1.01, 0.01))
        .enter()
        .append("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => d3.interpolateBlues(d));

        d3.select("#aliveScale svg")
        .append("rect")
        .attr("width", 150)
        .attr("height", 20)
        .style("fill", "url(#aliveGradient)");

        const deadGradient = d3.select("#deadScale svg")
        .append("defs")
        .append("linearGradient")
        .attr("id", "deadGradient")
        .attr("x1", "0%")
        .attr("x2", "100%");
        deadGradient.selectAll("stop")
        .data(d3.range(0, 1.01, 0.01))
        .enter()
        .append("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => d3.interpolateReds(d));

        d3.select("#deadScale svg")
        .append("rect")
        .attr("width", 150)
        .attr("height", 20)
        .style("fill", "url(#deadGradient)");
    
    filterChanged = false;
    }

    const aliveColor = d3.scaleSequential(d3.interpolateBlues).domain([0, maxAlive]);
    const deadColor = d3.scaleSequential(d3.interpolateReds).domain([0, maxDead]);

    categoryData.forEach(category => {
        d3.select("#heatmap").append("div")
        .attr("class", "cell")
        .style("background-color", category.alive === 0 ? "#FFFFFF" : aliveColor(category.alive))
        .on("mouseover", (event) => showTooltip(event, `Alive: ${category.alive}`))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);
    });

    categoryData.forEach(category => {
        d3.select("#heatmap").append("div")
        .attr("class", "cell")
        .style("background-color", category.dead === 0 ? "#FFFFFF" : deadColor(category.dead))
        .on("mouseover", (event) => showTooltip(event, `Dead: ${category.dead}`))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);
    });

    d3.select(".x-axis-labels")
        .selectAll("div")
        .data(categoryData)
        .enter()
        .append("div")
        .text(d => procedures[d.index]);
    }

    function updateHeatmap() {
    const filteredData = filterData();
    renderHeatmap(filteredData);
    }

    d3.select("#sortDropdown").on("change", function() {
    sortBy = this.value;
    filterChanged = false; // No scale update
    updateHeatmap();
    });

    d3.select("#filterDropdown").on("change", function() {
    filterBy = this.value;
    filterChanged = true; // Scale update required
    updateHeatmap();
    });

    updateHeatmap();

    function showTooltip(event, text) {
    tooltip.style("opacity", 1)
        .text(text)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    }

    function moveTooltip(event) {
    tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    }

    function hideTooltip() {
    tooltip.style("opacity", 0);
    }
});
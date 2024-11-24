document.addEventListener('DOMContentLoaded', function() {
    const margin = {top: 80, right: 40, bottom: 60, left: 60};
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#boxPlot")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    Promise.all([
        d3.csv("./Dataset/icu/icustays.csv"),
        d3.csv("./Dataset/hospital/patients.csv"),
        d3.csv("./Dataset/Processed/processed_data.csv")
    ]).then(function([icustays, patients, processedData]) {
        const data = processData(patients, icustays, processedData);
        createBoxPlot(svg, data, width, height);

        d3.select("#genderToggle").on("change", function() {
            updateBoxPlot(svg, data, width, height, this.checked);
            colorKey(svg, width, this.checked);
        });
    });
});

function removeOutliersAndAdjustYAxis(losValues) {
    const q1 = d3.quantile(losValues, 0.25);
    const q3 = d3.quantile(losValues, 0.75);
    const iqr = q3 - q1;
    const whiskerBottom = Math.max(0, q1 - 1.5 * iqr);
    const whiskerTop = q3 + 1.5 * iqr;
    const filteredData = losValues.filter(d => d >= whiskerBottom && d <= whiskerTop);
    return { filteredData, whiskerBottom, whiskerTop };
}

function processData(patients, icustays, processedData) {
    const ageGroups = [
        {name: "18 and younger", min: 0, max: 18},
        {name: "18-35", min: 18, max: 35},
        {name: "35-60", min: 35, max: 60},
        {name: "60-75", min: 60, max: 75},
        {name: "75 & older", min: 75, max: Infinity}
    ];

    return icustays.map(stay => {
        const patient = patients.find(p => p.subject_id === stay.subject_id);
        const processedPatient = processedData.find(p => p.subject_id === stay.subject_id);
        const inTime = new Date(stay.intime);
        const outTime = new Date(stay.outtime);
        const los = (outTime - inTime) / (1000 * 60 * 60 * 24);
        const ageGroup = ageGroups.find(group => patient.anchor_age >= group.min && patient.anchor_age < group.max);

        return {
            ageGroup: ageGroup ? ageGroup.name : "Unknown",
            los: isNaN(los) ? null : los,
            gender: patient ? patient.gender : "Unknown",
            status: processedPatient ? processedPatient.status : "Unknown"
        };
    }).filter(d => d.los !== null && d.ageGroup !== "Unknown" && d.gender !== "Unknown");
}

function createBoxPlot(svg, data, width, height, showGender = false) {
    const ageGroups = ["18 and younger", "18-35", "35-60", "60-75", "75 & older"];

    const x = d3.scaleBand()
        .domain(ageGroups)
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.los)])
        .nice()
        .range([height, 0]);

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    svg.append("text")
        .attr("class", "x-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .text("Age Group");

    svg.append("text")
        .attr("class", "y-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .style("text-anchor", "middle")
        .text("Length of Stay (days)");

    updateBoxPlot(svg, data, width, height, showGender);
    colorKey(svg, width, showGender);

}

function updateBoxPlot(svg, data, width, height, showGender = false) {
    const ageGroups = ["18 and younger", "18-35", "35-60", "60-75", "75 & older"];

    const x = d3.scaleBand()
        .domain(ageGroups)
        .range([0, width])
        .padding(0.1);

    const allLosValues = data.map(d => d.los).filter(d => !isNaN(d) && d !== null);
    const { whiskerBottom, whiskerTop } = removeOutliersAndAdjustYAxis(allLosValues);

    const y = d3.scaleLinear()
    .domain([whiskerBottom, whiskerTop])
    .nice()
    .range([height, 0]);

    const boxWidth = showGender ? x.bandwidth() / 2.2 : x.bandwidth();

    const boxPlotData = ageGroups.flatMap(ageGroup => {
        const ageData = data.filter(d => d.ageGroup === ageGroup);
        if (showGender) {
            return [
                { group: ageGroup, gender: 'M', data: ageData.filter(d => d.gender === 'M') },
                { group: ageGroup, gender: 'F', data: ageData.filter(d => d.gender === 'F') }
            ];
        } else {
            return [{ group: ageGroup, data: ageData }];
        }
    });

    const boxes = svg.selectAll('.box')
        .data(boxPlotData, d => d.group + (d.gender || ''));

    boxes.exit()
        .transition()
        .duration(500)
        .attr('transform', d => `translate(${x(d.group)},${height / 2})scale(1,0)`)
        .remove();

    const boxesEnter = boxes.enter()
        .append('g')
        .attr('class', 'box')
        .attr('transform', d => `translate(${x(d.group)},${height / 2})scale(1,0)`);

        boxesEnter.merge(boxes)
        .transition()
        .duration(1000)
        .attr('transform', d => {
            const xPos = x(d.group) + (showGender ? (d.gender === 'M' ? 0 : boxWidth) : 0);
            return `translate(${xPos},0)scale(1,1)`;
        })
        .each(function(d, i) {
            animateIVDrip(d3.select(this), d.data, i * 100, boxWidth, y, d.gender);
        });

    updateAxis(svg, x, y, height);
    updateLabels(svg, width, height, showGender ? "Age Group and Gender" : "Age Group", "Length of Stay (days)");
    colorKey(svg, width, showGender);
}

 

    function animateIVDrip(g, groupData, delay, boxWidth, yScale, gender) {
        const losValues = groupData.map(d => d.los).filter(d => !isNaN(d) && d !== null);
        if (losValues.length === 0) return;
    
        const { filteredData, whiskerBottom, whiskerTop } = removeOutliersAndAdjustYAxis(losValues);
    
        yScale.domain([whiskerBottom, whiskerTop]).nice();
        const sorted = losValues.sort(d3.ascending);
        const q1 = d3.quantile(sorted, 0.25);
        const median = d3.quantile(sorted, 0.5);
        const q3 = d3.quantile(sorted, 0.75);
    
        const deceasedCount = groupData.filter(d => d.status === 'deceased').length;
        const totalCount = groupData.length;
        const deceasedProportion = deceasedCount / totalCount;
    
        const gradientId = `liquid-gradient-${Math.random().toString(36).substr(2, 9)}`;
        const gradient = g.append("defs")
            .append("linearGradient")
            .attr("id", gradientId)
            .attr("x1", "0%")
            .attr("x2", "0%")
            .attr("y1", "0%")
            .attr("y2", "100%");
    
        if (gender === 'M') {
            gradient.append("stop")
                .attr("offset", `${deceasedProportion * 100}%`)
                .attr("stop-color", "navy");
    
            gradient.append("stop")
                .attr("offset", `${deceasedProportion * 100}%`)
                .attr("stop-color", "lightsteelblue");
        } else {
            gradient.append("stop")
                .attr("offset", `${deceasedProportion * 100}%`)
                .attr("stop-color", "deeppink");
    
            gradient.append("stop")
                .attr("offset", `${deceasedProportion * 100}%`)
                .attr("stop-color", "pink");
        }
                
            
        g.selectAll('.iv-bag')
        .data([1])
        .join('path')
        .attr('class', 'iv-bag')
        .attr('d', `
            M ${boxWidth * 0.2},${yScale(q3)}
            L ${boxWidth * 0.8},${yScale(q3)}
            L ${boxWidth * 0.8},${yScale(q1)}
            Q ${boxWidth * 0.8},${yScale(q1) + 12} ${boxWidth * 0.6},${yScale(q1) + 14}
            L ${boxWidth / 2},${yScale(q1) + 18}
            L ${boxWidth * 0.4},${yScale(q1) + 14}
            Q ${boxWidth * 0.2},${yScale(q1) + 12} ${boxWidth * 0.2},${yScale(q1)}
            Z
        `)
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('opacity', 0)
        .transition()
        .delay(delay)
        .duration(500)
        .attr('opacity', 1);

        g.selectAll('.liquid-level')
            .data([1])
            .join('path')
            .attr('class', 'liquid-level')
            .attr('d', `
                M ${boxWidth * 0.2},${yScale(median)}
                L ${boxWidth * 0.8},${yScale(median)}
                L ${boxWidth * 0.8},${yScale(q1)}
                Q ${boxWidth * 0.8},${yScale(q1) + 12} ${boxWidth * 0.6},${yScale(q1) + 14}
                L ${boxWidth / 2},${yScale(q1) + 18}
                L ${boxWidth * 0.4},${yScale(q1) + 14}
                Q ${boxWidth * 0.2},${yScale(q1) + 12} ${boxWidth * 0.2},${yScale(q1)}
                Z
            `)
            .attr('fill', `url(#${gradientId})`)
            .attr('opacity', 0)
            .transition()
            .delay(delay + 250)
            .duration(500)
            .attr('opacity', 0.7);

        g.selectAll('.iv-tube-top')
        .data([1])
        .join('line')
        .attr('class', 'iv-tube-top')
        .attr('x1', boxWidth / 2)
        .attr('x2', boxWidth / 2)
        .attr('y1', yScale(whiskerTop))
        .attr('y2', yScale(q3))
        .attr('stroke', 'black')
        .attr('stroke-width', boxWidth * 0.05)
        .style("opacity", 0)
        .transition()
        .delay(delay + 500)
        .duration(500)
        .style("opacity", 1);

        g.selectAll('.iv-tube-bottom')
            .data([1])
            .join('line')
            .attr('class', 'iv-tube-bottom')
            .attr('x1', boxWidth / 2)
            .attr('x2', boxWidth / 2)
            .attr('y1', yScale(q1) + 15) 
            .attr('y2', yScale(whiskerBottom))
            .attr('stroke', 'black')
            .attr('stroke-width', boxWidth * 0.05)
            .style("opacity", 0)
            .transition()
            .delay(delay + 500)
            .duration(500)
            .style("opacity", 1);

        g.selectAll('.median-line')
        .data([median])
        .join('line')
        .attr("class", "median-line")
        .attr("x1", boxWidth * 0.2)
        .attr("x2", boxWidth * 0.8)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .style("opacity", 0)
        .transition()
        .delay(delay + 750)
        .duration(500)
        .style("opacity", 1);

    
        
    }

function updateAxis(svg, xScale, yScale, height) {
    svg.select('.x-axis')
        .transition()
        .duration(1000)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("font-size", "14px");
    
    svg.select('.y-axis')
        .transition()
        .duration(1000)
        .call(d3.axisLeft(yScale));
    }

function updateLabels(svg, width, height, xLabel, yLabel) {
    svg.select('.x-label')
        .transition()
        .duration(1000)
        .text(xLabel);

    svg.select('.y-label')
        .transition()
        .duration(1000)
        .text(yLabel);
}

function colorKey(svg, width, showGender) {
    const colorKeyContainer = d3.select('#color-key-container');
    colorKeyContainer.selectAll('*').remove();

    if (showGender) {
        const colorCategories = [
            { color: "navy", text: "Male (Deceased)" },
            { color: "lightsteelblue", text: "Male (Alive)" },
            { color: "deeppink", text: "Female (Deceased)" },
            { color: "pink", text: "Female (Alive)" }
        ];

        colorKeyContainer.selectAll('.color-key')
            .data(colorCategories)
            .enter()
            .append('span')
            .attr('class', 'color-key')
            .style('display', 'inline-flex')
            .style('align-items', 'center')
            .style('margin-right', '20px')
            .html(d => `
                <span style="background-color: ${d.color}; 
                             width: 15px; 
                             height: 15px; 
                             border-radius: 50%; 
                             display: inline-block; 
                             margin-right: 4px;"></span> 
                ${d.text}
            `);

        colorKeyContainer.style('display', 'block');
    } else {
        colorKeyContainer.style('display', 'none');
    }
}
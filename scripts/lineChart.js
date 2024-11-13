let stays = [];

const vitals_path  = '/Dataset/icu/chartevents.csv';
const medicatons_path = '/Dataset/icu/medicationinput.csv';
let selected_data;
let medications_data=[];



document.addEventListener("DOMContentLoaded", function() {
    let setOfStays = new Set();
    d3.csv(vitals_path).then(data => {
        data.map(d=>{
            setOfStays.add(d["hadm_id"]);
        });
        stays = Array.from(setOfStays).sort();
        var stay_select = document.getElementById('stay_select');
        stays.forEach(function(col_name){
            var new_option = document.createElement('option');
            new_option.value = col_name;
            new_option.text = col_name;
            stay_select.appendChild(new_option);  
        });
        document.getElementById('stay_select').value = stays[0];
        getData();
    });
   
  });

function removeAllOptions(id){
    const selectObj = document.getElementById(id);
    while (selectObj.options.length > 0) {
        selectObj.remove(0);
    }
}
function getData(){
    
    const stay_id = document.getElementById('stay_select').value;
    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    d3.csv(vitals_path).then(data => {
        individual_data = data.filter(d=>d["hadm_id"]==stay_id)
        .map(d => ({
            hadm_id: +d["hadm_id"],
            item_id: +d["itemid"],
            valuenum: +d["valuenum"],
            charttime: parseTime(d["charttime"])
        }));
        selected_data = individual_data;
        console.log("Selected id data : ", selected_data);

        d3.csv(medicatons_path).then(data1 => {
            individual_data1 = data1.filter(d1=>d1["hadm_id"]==stay_id)
            .map(d1 => ({
                hadm_id: +d1["hadm_id"],
                ordercategoryname: d1['ordercategoryname'],
               
                starttime: parseTime(d1["starttime"])
            }));
            medications_data = individual_data1;
            drawHeartChart();
            drawOxygenChart();
            drawRespChart();
            console.log("Medications Data: ", medications_data);
            // color_scale = d3.scaleOrdinal()
            // .domain(medications_data.map(d1=>d1.ordercategoryname))
            // .range(d3.schemeCategory10);

        });
        
    });

    
    
}
const categories = Array.from(new Set(medications_data.map(d1=>d1[ordercategoryname])))
console.log("Categories: ", categories)
const color_scale=d3.scaleOrdinal()
.domain(categories)
.range(d3.schemeCategory10)



function drawHeartChart(){
    // console.log('here!');
    var margin = {top: 20, right: 50, bottom: 20, left: 60},
    width = 1050 - margin.left - margin.right,
    height = 175 - margin.top - margin.bottom;
    const filtered_data = selected_data.filter(data=>data["item_id"]==220045)
    .sort((a, b) => new Date(a["charttime"]) - new Date(b["charttime"]));;
    console.log("Heart Rate : " , filtered_data);
    
    // console.log(d3.extent(filtered_data, function(d) { return d.charttime; }));

    var svg = d3.select("#hr_chart")
    svg.selectAll("*").remove() 
    svg=svg.append("g")
        .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");
        
    var x = d3.scaleTime()
        .domain(d3.extent(filtered_data, function(d) { return d.charttime; }))
        .range([ 0, width ]);
    svg.append("g")
        .attr("transform", "translate(0 ," + height + ")")
        .attr("stroke","white")
        .call(d3.axisBottom(x))
        .selectAll("path")
        .style("stroke","white")
    svg.selectAll(".tick line")
    .style("stroke","white")
      

    
    var y = d3.scaleLinear()
        .domain([d3.min(filtered_data, function(d) { return +d.valuenum; }), d3.max(filtered_data, function(d) { return +d.valuenum; })])
        .range([ height, 0 ]);
    svg.append("g")
    .attr("stroke","white")
    .call(d3.axisLeft(y))
    .selectAll("path")
    .style("stroke","white")
    svg.selectAll(".tick line")
    .style("stroke","white")

    //Joins Modification 1
    const line_generator = d3.line()
    .x(d=>x(d.charttime))
    .y(d=>y(d.valuenum))

    svg.selectAll("path.line")
    .data([filtered_data],d=>d.charttime)
    .join(
        enter=>enter.append("path")
        .attr("class","line")
        .attr("fill","none")
        .attr("stroke","white")
        .attr("stroke-width", 1)
        .attr("d", line_generator)
        // .call(enter=>enter.transition().duration(1000)),
        .attr("stroke-dasharray", function(){
            const length = this.getTotalLength();
            return `${length} ${length}`;
        })
        .attr("stroke-dashoffset", function(){
            return this.getTotalLength();
        })

        .transition().duration(15000)
        .attr("stroke-dashoffset",0)                                                                                                                            

        // //update
        // update=>update
        // // .attr("stroke", "black")
        // .transition().duration(15000)
        // .attr("d", line_generator),

        // //exit
        // exit=>exit
        // .attr("stroke","brown")
        // .transition().duration(1000)
        // .attr("stroke-dashoffset", function(){
        //     return -this.getTotalLength();
        // })
        // .remove()

    )

    // //Joins Modification
    // const line = svg.selectAll("path.line")
    // .data([filtered_data]);

    // line.enter()
    // .append("path")
    // .attr("class","line")
    // .attr("fill","none")
    // .attr("stroke","black")
    // .attr("stroke-width",1)
    // .attr("d", d3.line()
    //     .x(d=>x(d.charttime))
    //     .y(d=>y(d.valuenum))
    // )

    // line.transition()
    // .duration(1000)
    // .attr("d", d3.line()
    //     .x(d=>x(d.charttime))
    //     .y(d=>y(d.valuenum))
    // )

    // line.exit().remove()

    // //Animations..
    // svg.selectAll("path.line")
    // .data([filtered_data])
    // .join("path")
    // .attr("class","line")
    // .attr("fill","none")
    // .attr("stroke","black")
    // .attr("stroke-width",1)
    // .transition().duration(1000)
    // .attr("d",d3.line()
    //     .x(function(d){return x(d.charttime)})
    //     .y(function(d){return y(d.valuenum)})
    // )
    

    // //Initial Code..
    // svg.append("path")
    //     .datum(filtered_data)
    //     .attr("fill", "none")
    //     .attr("stroke", "steelblue")
    //     .attr("stroke-width", 5)
    //     .attr("d", d3.line()
    //         .x(function(d) { return x(d.charttime)})
    //         .y(function(d) { return y(d.valuenum) })
    //         )



   

    // Create a lookup function to get valuenum for a specific charttime
    function getValuenumForTime(time) {
        // Find the data point with the closest `charttime` to the given `time`
        const closest = filtered_data.reduce((prev, curr) => {
            return Math.abs(curr.charttime - time) < Math.abs(prev.charttime - time) ? curr : prev;
        });
        return closest.valuenum;
    }

 //New Circles with animations..
 // Animate circles representing data points with matching y-attribute from the first graph
setTimeout(()=>{svg.selectAll("circle.data-point")
.data(medications_data, d1 => d1.starttime)
.join(
    enter => enter.append("circle")
        .attr("class", "data-point")
        .attr("r", 5)
        .attr("fill", d1 => color_scale(d1.ordercategoryname))
        .attr("cx", d1 => x(d1.starttime))
        .attr("cy", d1 => {
            const matchingValuenum = getValuenumForTime(d1.starttime);
            return matchingValuenum ? y(matchingValuenum) : null;
        })
        .style("opacity",0)
        .transition()
        
        
        .duration(1000)
        .style("opacity",1)

   
)
.on("mouseover", function(event,d1){
    heart_tooltip.style("display","block").text(d1.ordercategoryname);
})

.on("mousemove", function(event){
    heart_tooltip.style("left", (event.pageX+5)+"px")
    .style("top",(event.pageY-5)+"px");

})


.on("mouseout", function(event){
    heart_tooltip.style("display","none");
})
.attr("class",d1=>color_scale(d1.ordercategoryname)?"meds-circle":" ")
},15000)




// Animate click circles
// svg.selectAll("circle.click-circle")
// .data(filtered_data, d => d.charttime)
// .join(
//     enter => enter.append("circle")
//         .attr("class", "click-circle")
//         .attr("r", 2)
//         .attr("fill", "blue")
//         .attr("opacity",0)
//         .attr("cx", d => x(d.charttime))
//         .attr("cy", d => y(d.valuenum))
//         .on("click", function(event, d) {
//             d3.select("#heart_value").text(d.valuenum);
           
//             console.log(d);
//         }),

//     update => update.transition().ease(d3.easeElastic).duration(3000)  // Slower, with bounce effect
//         .attr("cx", d => x(d.charttime))
//         .attr("cy", d => y(d.valuenum))
//         .attr("fill", "#4682B4")  // Highlight color during transition
//         .transition().duration(15000)
//         .attr("fill", "blue"),  // Return to original color

//     exit => exit.transition().duration(500)
//         .attr("r", 0)
//         .remove()
// )
 


    
//Initial plot of circles without animations..
// Circles representing data points with matching y-attribute from the first graph
    // svg.selectAll("circle")
    // .data(medications_data)
    // .enter()
    // .append("circle")
    // .attr("cx", d1 => x(d1.starttime))
    // .attr("cy", d1 => {
    //     const matchingValuenum = getValuenumForTime(d1.starttime);
    //     return matchingValuenum ? y(matchingValuenum) : null;
    // })
    // .attr("r", 3)
    // .attr("fill", d1=>color_scale(d1.ordercategoryname))
    // // .attr("fill", "red")

    // .on("mouseover", function(event,d1){
    //     heart_tooltip.style("display","block").text(d1.ordercategoryname);
    // })

    // .on("mousemove", function(event){
    //     heart_tooltip.style("left", (event.pageX+5)+"px")
    //     .style("top",(event.pageY-5)+"px");

    // })


    // .on("mouseout", function(event){
    //     heart_tooltip.style("display","none");
    // })

    // //Uncomment this out for on-click function of medication points.

    // // .on("click", function(event, d1) {
    // //     d3.select("#heart_value").text(d1.valuenum);
    // //     console.log("D1: ",d1   )
    // // }); 

    //Click Circle
    svg.selectAll("click_circle")
    .data(filtered_data )
    .enter()
    .append("circle")
    .attr("cx", d=>x(d.charttime))
    .attr("cy", d=>y(d.valuenum))
    .attr("r",2)
    .attr("fill", "blue")
    .attr("opacity",0)
    .on("click", function(event, d){
        d3.select("#heart_value").text(d.valuenum)
        
        console.log(d)
    })


    //Tooltip 
    const heart_tooltip = d3.select("body").append("div")
    .style("position","absolute")
    .style("background","white")
    .style("padding","5px")
    .style("border-radius","5px")
    .style("border","1px solid black")
    .style("display","none");


    



    
}


function drawOxygenChart(){
    var margin = {top: 20, right: 50, bottom: 20, left: 60},
    width = 1050 - margin.left - margin.right,
    height = 175 - margin.top - margin.bottom;
    const filtered_data = selected_data.filter(data=>data["item_id"]==220277)
    .sort((a, b) => new Date(a["charttime"]) - new Date(b["charttime"]));
    console.log("Oxygen Rate : " , filtered_data);
    
    // console.log(d3.extent(filtered_data, function(d) { return d.charttime; }));

    var svg = d3.select("#o2_chart")
    svg.selectAll("*").remove()
    svg=svg.append("g")
        .attr("transform","translate(" + margin.left + "," + margin.top + ")");
        
    var x = d3.scaleTime()
        .domain(d3.extent(filtered_data, function(d) { return d.charttime; }))
        .range([ 0, width ]);
    svg.append("g")
        .attr("transform", "translate(0," + (height-5) + ")")
        .attr("stroke","white")
        .call(d3.axisBottom(x))
        .selectAll("path")
        .style("stroke","white")
    svg.selectAll(".tick line")
    .style("stroke","white")

    
    var y = d3.scaleLinear()
        .domain([d3.min(filtered_data, function(d) { return +d.valuenum; }), d3.max(filtered_data, function(d) { return +d.valuenum; })])
        .range([ height-5, 0 ]);
    svg.append("g")
        .attr("stroke","white")
        .call(d3.axisLeft(y))
        .selectAll("path")
        .style("stroke","white")
    svg.selectAll(".tick line")
    .style("stroke","white")

    //New Code..
    const line_generator = d3.line()
    .x(d=>x(d.charttime))
    .y(d=>y(d.valuenum))
    .curve(d3.curveMonotoneX)

    svg.selectAll("path.line")
    .data([filtered_data],d=>d.charttime)
    .join(
        enter=>enter.append("path")
        .attr("class","line")
        .attr("fill","none")
        .attr("stroke","white")
        .attr("stroke-width", 1)
        .attr("d", line_generator)
        .attr("stroke-dasharray", function(){
            const length = this.getTotalLength();
            return `${length} ${length}`;
        })
        .attr("stroke-dashoffset", function(){
            return this.getTotalLength();
        })

        .transition().duration(15000)
        .attr("stroke-dashoffset",0),

        //update
        update=>update
        .attr("stroke", "black")
        .transition().duration(5000)
        .attr("d", line_generator),

        //exit
        exit=>exit
        .attr("stroke","brown")
        .transition().duration(1000)
        .attr("stroke-dashoffset", function(){
            return -this.getTotalLength();
        })
        .remove()

    )
    
    //Initial Code for Line Chart..
    // svg.append("path")
    //     .datum(filtered_data)
    //     .attr("fill", "none")
    //     .attr("stroke", "steelblue")
    //     .attr("stroke-width", 1.5)
    //     .attr("d", d3.line()
    //         .x(function(d) { return x(d.charttime)})
    //         .y(function(d) { return y(d.valuenum) })
    //         .curve(d3.curveMonotoneX)
    
    //     )

        //Changes
        function getValuenumForTime(time) {
            // Find the data point with the closest `charttime` to the given `time`
            const closest = filtered_data.reduce((prev, curr) => {
                return Math.abs(curr.charttime - time) < Math.abs(prev.charttime - time) ? curr : prev;
            });
            return closest.valuenum;
        }
        
    
    // Circles representing data points with matching y-attribute from the first graph
    setTimeout(()=>{svg.selectAll("circle.data-point")
        .data(medications_data, d1 => d1.starttime)
        .join(
            enter => enter.append("circle")
                .attr("class", "data-point")
                .attr("r", 5)
                .attr("fill", d1 => color_scale(d1.ordercategoryname))
                .attr("cx", d1 => x(d1.starttime))
                .attr("cy", d1 => {
                    const matchingValuenum = getValuenumForTime(d1.starttime);
                    return matchingValuenum ? y(matchingValuenum) : null;
                })
                .style("opacity",0)
                .transition()
                
                
                .duration(1000)
                .style("opacity",1)
        
           
        )
        .on("mouseover", function(event,d1){
            oxygen_tooltip.style("display","block").text(d1.ordercategoryname);
        })
        
        .on("mousemove", function(event){
            oxygen_tooltip.style("left", (event.pageX+5)+"px")
            .style("top",(event.pageY-5)+"px");
        
        })
        
        
        .on("mouseout", function(event){
            oxygen_tooltip.style("display","none");
        })
        .attr("class",d1=>color_scale(d1.ordercategoryname)?"meds-circle":" ")
        },15000)

        const oxygen_tooltip = d3.select("body").append("div")
        .style("position","absolute")
        .style("background","white")
        .style("padding","5px")
        .style("border-radius","5px")
        .style("border","1px solid black")
        .style("display","none");
    

    //Circles for representing the datapoint and adding on click event
    svg.selectAll("oxygen_circle")
    .data(filtered_data)
    .enter()
    .append("circle")
    .attr("fill", "blue")
    .attr("opacity",0)
    .attr("r",2)
    
    .attr("cx", d=>x(d.charttime))
    .attr("cy", d=>y(d.valuenum))
    
    .on("click", function(event,d){
        d3.select("#oxygen_value").text(d.valuenum)
    })

    
}




function drawRespChart(){
    var margin = {top: 20, right: 50, bottom: 20, left: 60},
    width = 1050 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;
    const filtered_data = selected_data.filter(data=>data["item_id"]==220179 || data["item_id"]==220180)
    .sort((a, b) => new Date(a["charttime"]) - new Date(b["charttime"]));
    console.log("Resp_Chart Filtered Data: ", filtered_data);
    
    // console.log(d3.extent(filtered_data, function(d) { return d.charttime; }));

    
    var svg = d3.select("#bp_chart")
    svg.selectAll("*").remove() 
    svg=svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        
    var x = d3.scaleTime()
        .domain(d3.extent(filtered_data, function(d) { return d.charttime; }))
        .range([ 0, width ]);
    svg.append("g")
        .attr("transform", "translate(-10," + (height-10) + ")")
        .attr("stroke","white")
        .call(d3.axisBottom(x))
        .selectAll("path")
        .style("stroke","white")
    svg.selectAll(".tick line")
    .style("stroke","white")

    
    var y = d3.scaleLinear()
        .domain([0, d3.max(filtered_data, function(d) { return +d.valuenum; })])
        
        .range([ height-10, 0 ]);
    svg.append("g")
        .attr("transform",`translate(-10)`)
        .attr("stroke","white")
        .call(d3.axisLeft(y))
        .selectAll("path")
        .style("stroke","white")
    svg.selectAll(".tick line")
    .style("stroke","white")
    

    //New Code for Line Chart..
    const line_generator = d3.line()
    .x(d=>x(d.charttime))
    .y(d=>y(d.valuenum))
    .curve(d3.curveCatmullRom.alpha(1))

    svg.selectAll("path.line")
    .data([filtered_data],d=>d.charttime)
    .join(
        enter=>enter.append("path")
        .attr("class","line")
        .attr("fill","none")
        .attr("stroke","white")
        .attr("stroke-width", 1)
        .attr("d", line_generator)
        .attr("stroke-dasharray", function(){
            const length = this.getTotalLength();
            return `${length} ${length}`;
        })
        .attr("stroke-dashoffset", function(){
            return this.getTotalLength();
        })

        .transition().duration(15000)
        .attr("stroke-dashoffset",0),

        //update
        update=>update
        .attr("stroke", "black")
        .transition().duration(5000)
        .attr("d", line_generator),

        //exit
        exit=>exit
        .attr("stroke","brown")
        .transition().duration(1000)
        .attr("stroke-dashoffset", function(){
            return -this.getTotalLength();
        })
        .remove()

    )
    //Initial Code for the Line Chart..
    // svg.append("path")
    //     .datum(filtered_data)
    //     .attr("fill", "none")
    //     .attr("stroke", "steelblue")
    //     .attr("stroke-width", 1.5)
    //     .attr("d", d3.line()
    //         .x(function(d) { return x(d.charttime)})
    //         .y(function(d) { return y(d.valuenum) })
    //         .curve(d3.curveCatmullRom.alpha(1)) //change this for display for 3rd graph.
    //         )
    

            function getValuenumForTime(time) {
                // Find the data point with the closest `charttime` to the given `time`
                const closest = filtered_data.reduce((prev, curr) => {
                    return Math.abs(curr.charttime - time) < Math.abs(prev.charttime - time) ? curr : prev;
                });
                return closest.valuenum;
            }
            
        
        // Circles representing data points with matching y-attribute from the first graph
        setTimeout(()=>{svg.selectAll("circle.data-point")
            .data(medications_data, d1 => d1.starttime)
            .join(
                enter => enter.append("circle")
                    .attr("class", "data-point")
                    .attr("r", 5)
                    .attr("fill", d1 => color_scale(d1.ordercategoryname))
                    .attr("cx", d1 => x(d1.starttime))
                    .attr("cy", d1 => {
                        const matchingValuenum = getValuenumForTime(d1.starttime);
                        return matchingValuenum ? y(matchingValuenum) : null;
                    })
                    .style("opacity",0)
                    .transition()
                    
                    
                    .duration(1000)
                    .style("opacity",1)
            
               
            )
            .on("mouseover", function(event,d1){
                resp_tooltip.style("display","block").text(d1.ordercategoryname);
            })
            
            .on("mousemove", function(event){
                resp_tooltip.style("left", (event.pageX+5)+"px")
                .style("top",(event.pageY-5)+"px");
            
            })
            
            
            .on("mouseout", function(event){
                resp_tooltip.style("display","none");
            })
            .attr("class",d1=>color_scale(d1.ordercategoryname)?"meds-circle":" ")
            },15000)
    
            const  resp_tooltip = d3.select("body").append("div")
            .style("position","absolute")
            .style("background","white")
            .style("padding","5px")
            .style("border-radius","5px")
            .style("border","1px solid black")
            .style("display","none");
      
    
    //Clicking circle
    svg.selectAll("resp_circle")
    .data(filtered_data)
    .enter()
    .append("circle")
    .attr("cx",d=>x(d.charttime))
    .attr("cy",d=>y(d.valuenum))
    .attr("fill","blue")
    .attr("opacity",0)
    .attr("r","2")
    .on("click",function(event,d){  
        if(d.item_id==220179)
        d3.select("#syst_value").text(d.valuenum)

        if(d.item_id==220180)
        d3.select("#dias_value").text(d.valuenum)
    })
}


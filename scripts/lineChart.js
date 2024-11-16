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
    d3.select("#heart_value").text(filtered_data[0].valuenum)
    
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
    const heart_line = d3.line()
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
        .attr("d", heart_line)
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

       

    )


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

    //Click Circle
    svg.selectAll("click_circle")
    .data(filtered_data )
    .enter()
    .append("circle")
    .attr("cx", d=>x(d.charttime))
    .attr("cy", d=>y(d.valuenum))
    .attr("r",2)
    .attr("fill", "blue")
    //.attr("opacity",0)
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
    d3.select("#oxygen_value").text(filtered_data[0].valuenum);
    
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
    const o2_line = d3.line()
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
        .attr("d", o2_line)
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
        .attr("d", o2_line),

        //exit
        exit=>exit
        .attr("stroke","brown")
        .transition().duration(1000)
        .attr("stroke-dashoffset", function(){
            return -this.getTotalLength();
        })
        .remove()

    )
    
    
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
    //.attr("opacity",0)
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
    const filtered_data = selected_data.filter(data=>data["item_id"]==220179 || data["item_id"]==220180 )
    
    .sort((a, b) => new Date(a["charttime"]) - new Date(b["charttime"]));
    console.log("Resp_Chart Filtered Data: ", filtered_data);
    
    
    //console.log(d3.extent(filtered_data, function(d) { return d.charttime; }));

    
    var svg = d3.select("#bp_chart")
    svg.selectAll("*").remove() 
    svg=svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        
    var x = d3.scaleTime()
        .domain(d3.extent(filtered_data, function(d) { return d.charttime; }))
        .range([ 0, width ]);
    svg.append("g")
        .attr("transform", "translate(-10," + (height) + ")")
        .attr("stroke","white")
        .call(d3.axisBottom(x))
        .selectAll("path")
        .style("stroke","white")
    svg.selectAll(".tick line")
    .style("stroke","white")

    
    var y = d3.scaleLinear()
        .domain([0, d3.max(filtered_data, function(d) { return +d.valuenum; })])
        
        .range([ height, 0 ]);
    svg.append("g")
        .attr("transform",`translate(-10)`)
        .attr("stroke","white")
        .call(d3.axisLeft(y))
        .selectAll("path")
        .style("stroke","white")
    svg.selectAll(".tick line")
    .style("stroke","white")
    

    //New Code for Line Chart..
    const resp_line = d3.line()
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
        .attr("d", resp_line)
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
        .attr("d", resp_line),

        //exit
        exit=>exit
        .attr("stroke","brown")
        .transition().duration(1000)
        .attr("stroke-dashoffset", function(){
            return -this.getTotalLength();
        })
        .remove()

    )
    
    

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
                    //Remove circles that go outside the x-axis.
                    .filter(function(d1){
                        const x_position = x(d1.starttime);
                        return x_position >=0 && x_position<=width;
                    })
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
    // .attr("opacity",0)
    .attr("r","2")
    .on("click",function(event,d){  
        if(d.item_id==220179)
        d3.select("#syst_value").text(d.valuenum)

        if(d.item_id==220180)
        d3.select("#dias_value").text(d.valuenum)
    })
}


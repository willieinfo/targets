
let targetChart = null; 

// Function to fetch data and process the sales data for chart and table
async function SalesTarget(cStorname='',dTargDate='') {
    const formatter = new Intl.NumberFormat('en-US'); // 'en-US' for U.S. formatting
    const dataTarget = "./SalesTarg/DB_SALEACHV.json"; // Path to the JSON data file
    try {
        const response = await fetch(dataTarget);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const salesAchv = await response.json(); // Get all sales data

        // Filter by store name if provided
        const filteredData = salesAchv.filter(item => 
            (!cStorname || item.storname === cStorname) &&
            (!dTargDate || item.targdate === dTargDate)
        );

        // Prepare the data for the chart and table
        const labels = [];
        const runtotal = [];
        const pctachvd = [];
        const netSales = [];
        const run_targ = [];
        const targetDate = [];
        const targsale = filteredData.length > 0 ? filteredData[0].targsale : 0;

        filteredData.forEach(item => {
            const [month, day] = item.datesale.split('/'); // Split the date
            labels.push(`${month}/${day}`); // Format label as mm/dd

            // Only add data if targsale > 0
            if (item.targsale > 0) {
                run_targ.push(item.run_targ);
                pctachvd.push(item.pctachvd);
                netSales.push(item.netsales);
                targetDate.push(item.targdate);
                if (item.netsales > 0) {
                    runtotal.push(item.runtotal);
                } else {
                    runtotal.push(null); 
                }
            }
        });

        const dates = filteredData.map(entry => new Date(entry.datesale));
        const maxDate = new Date(Math.max(...dates));
        document.getElementById('labelDataTabl1').innerText=`${cStorname.trim()}`
        document.getElementById('labelDataTabl2').innerText=`Target Date: ${maxDate.toLocaleDateString('en-US')}`
        document.getElementById('labelDataTabl3').innerText=`Target Sales: ${formatter.format(targsale)}`
        
        // Destroy existing chart if it exists
        if (targetChart) {
            targetChart.destroy();
        }

        const ctx = document.getElementById('targetChart').getContext('2d');

        // Create the chart (line chart for running total)
        targetChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Running Total',
                        data: runtotal,
                        borderColor: 'rgb(0,0,255)',
                        borderWidth: 2,
                        yAxisID: 'y',
                    },
                    {
                        label: 'Daily Target',
                        data: run_targ,
                        borderColor: 'rgb(0,255,0)',
                        borderWidth: 2,
                        tension: 0.4,
                        yAxisID: 'y',
                    },
                    {
                        label: `Sales Target: ${formatter.format(targsale)}`,
                        data: labels.map(() => targsale),
                        type: 'line',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        yAxisID: 'y',
                        borderDash: [5, 5],
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allows custom height/width
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                if (context.datasetIndex === 0) {
                                    const index = context.dataIndex;
                                    return context.raw !== null
                                        ? `Running Total: ${context.raw}, Achievement: ${pctachvd[index]}%`
                                        : 'No Data';
                                }
                                return `Sales Target: ${context.raw}`;
                            },
                        },
                    },
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: `Projected Sales : ${cStorname.trim()}`,
                        font: {
                            size: 14
                        }
                    },

                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Running Total',
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Sales Amount',
                        },
                        beginAtZero: true,
                    },
                },
            },
        });

        // Now populate the table below the chart
        populateTable(filteredData, runtotal, pctachvd);

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

async function storeTargets() {
    const formatter = new Intl.NumberFormat('en-US'); // 'en-US' for U.S. formatting
    const table = document.getElementById('salesTargetTable');
    const tableBody = table.querySelector('tbody');
    tableBody.innerHTML = ''; // Clear any existing rows

    // Create the table header with template literals (only once)
    if (!table.querySelector('thead')) { 
        const headerHTML = `
            <thead>
                <tr>
                    <th>Store Name</th>
                    <th>Sales Target</th>
                    <th>Starting Date</th>
                    <th>Target Date</th>
                    <th>As Of Date</th>
                    <th>Actual Sales</th>
                    <th>Achievement (%)</th>
                </tr>
            </thead>
        `;
        table.insertAdjacentHTML('afterbegin', headerHTML); // Insert the header at the start of the table
    }


    const dataTarget = "./SalesTarg/DB_SALEACHV.json";

    try {
        const response = await fetch(dataTarget);
        if (!response.ok) throw new Error('Network response was not ok');
    
        const detailTargets = await response.json();
    
        // Group data by `storname` and `targdate`
        const groupedData = detailTargets.reduce((acc, item) => {
            const key = `${item.storname}-${item.targdate}`;
            if (!acc[key]) {
                acc[key] = {
                    storname: item.storname,
                    targsale: item.targsale,
                    begindte: item.begindte,
                    targdate: item.targdate,
                    asofdate: item.datesale, // Initialize with the first date
                    maxRuntotal: item.runtotal, // Track the max runtotal
                    totalnet: item.netsales, // Initialize with the first net sale
                };
            } else {
                // Update max runtotal and corresponding asofdate
                if (item.runtotal > acc[key].maxRuntotal) {
                    acc[key].maxRuntotal = item.runtotal;
                    acc[key].asofdate = item.datesale;
                }
                // Accumulate totalnet
                acc[key].totalnet += item.netsales;
            }
            return acc;
        }, {});
    
        // Compute pctachvd for each group
        Object.values(groupedData).forEach(item => {
            item.pctachvd = (item.totalnet / item.targsale) * 100;
        });
    
        // Sort groupedData by storname and targdate
        const sortedData = Object.entries(groupedData)
            .sort((a, b) => {
                const [stornameA, targdateA] = a[0].split('-');
                const [stornameB, targdateB] = b[0].split('-');
                // Sort by storname first
                if (stornameA < stornameB) return -1;
                if (stornameA > stornameB) return 1;
                // If storname is the same, sort by targdate
                return targdateA < targdateB ? -1 : targdateA > targdateB ? 1 : 0;
            })
            .map(([key, value]) => value); // Convert back to array of values
    
        // Add rows to the table
        sortedData.forEach((item) => {
            const rowHTML = `
                <tr class="trTargetDiv" data-storname="${item.storname}" data-targdate="${item.targdate}">
                    <td>${item.storname}</td>
                    <td>${formatter.format(item.targsale)}</td>
                    <td>${item.begindte}</td>
                    <td>${item.targdate}</td>
                    <td>${item.asofdate}</td>
                    <td>${formatter.format(item.totalnet)}</td>
                    <td class="pctAchvdColumn">${formatter.format(item.pctachvd.toFixed(2))}%</td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', rowHTML); // Append the row to the tbody
        });
        

    // Highlight the first row by default
    const firstRow = tableBody.querySelector('.trTargetDiv');
    if (firstRow) {
        highlightRow(firstRow);
    }

    // Add event listener to the rows
    tableBody.addEventListener('click', (event) => {
        const target = event.target.closest('.trTargetDiv');
        if (target) {
            highlightRow(target);
            const storname = target.dataset.storname || '';
            const targdate = target.dataset.targdate || '';
            SalesTarget(storname, targdate);
        }
    });

    } catch (error) {
        console.error('Error fetching data:', error);
    }

    // Function to highlight a row and show the arrow in the pctachvd column
    function highlightRow(row) {
        // Reset the background color and clear arrows in the pctachvd column for all rows
        document.querySelectorAll('.trTargetDiv').forEach(row => {
            row.style.backgroundColor = ''; // Clear any existing highlights
            const pctColumn = row.querySelector('.pctAchvdColumn');
            if (pctColumn) {
                pctColumn.textContent = pctColumn.textContent.replace('   ◄', ''); // Remove the arrow
            }
        });

        // Highlight the clicked row
        row.style.backgroundColor = 'lightblue';

        // Add the arrow to the pctachvd column of the active row
        const pctColumn = row.querySelector('.pctAchvdColumn');
        if (pctColumn) {
            pctColumn.textContent += '   ◄'; // Append the arrow
        }
    }
}
storeTargets();

function populateTable(filteredData, runtotal, pctachvd) {
    const formatter = new Intl.NumberFormat('en-US'); // 'en-US' for U.S. formatting
    const table = document.getElementById('salesDataTable');
    const tableBody = table.querySelector('tbody');
    tableBody.innerHTML = ''; // Clear any existing rows

    // Create the table header with template literals (only once)
    if (!table.querySelector('thead')) { 
        const headerHTML = `
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Daily Net Sales</th>
                    <th>Running Daily Target</th>
                    <th>Running Sales Total</th>
                    <th>Achievement (%)</th>
                </tr>
            </thead>
        `;
        table.insertAdjacentHTML('afterbegin', headerHTML); // Insert the header at the start of the table
    }

    // Create the rows for the body using template literals
    filteredData.forEach((item, index) => {
        if (item.netsales===0) return
        let dDateSale=new Date(item.datesale)

        const rowHTML = `
            <tr id="trTableDiv">
                <td id="tdDateSale">${formatDate(dDateSale)}</td> 
                <td id="tdNetSales">${formatter.format(item.netsales)}</td> 
                <td id="tdRun_Targ">${formatter.format(item.run_targ)}</td> 
                <td id="tdRunTotal">${formatter.format(runtotal[index]) || '-'}</td> 
                <td id="tdPctAchvd">${pctachvd[index] ? pctachvd[index].toFixed(2)+'%' : '-'}</td> 
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', rowHTML); // Append the row to the tbody
    });
}


function formatDate(date) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = dayNames[date.getDay()];
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).padStart(4, '0');
    return `${month}/${day}/${year} -${dayOfWeek}`;
}

window.onload = async () => {
    const dataTarget = "./SalesTarg/DB_SALEACHV.json"; // Path to the JSON data file

    try {
        // Fetch the data
        const response = await fetch(dataTarget);
        if (!response.ok) throw new Error('Network response was not ok');

        const salesAchv = await response.json(); // Parse the JSON data

        // Sort the salesAchv array by storname and targdate
        const sortedSalesAchv = salesAchv.sort((a, b) => {
            // Sort by storname first
            if (a.storname < b.storname) return -1;
            if (a.storname > b.storname) return 1;
            // If storname is the same, sort by targdate
            return a.targdate < b.targdate ? -1 : a.targdate > b.targdate ? 1 : 0;
        });

        // Use the first record's values as the initial parameters
        if (sortedSalesAchv.length > 0) {
            const firstRecord = sortedSalesAchv[0];
            const cStorname = firstRecord.storname || ''; 
            const dTargDate = firstRecord.targdate || ''; 

            // Call SalesTarget with the initial parameters
            SalesTarget(cStorname, dTargDate);
        } else {
            console.warn('No data available in the JSON file.');
        }
    } catch (error) {
        console.error('Error fetching or processing data on page load:', error);
    }
};


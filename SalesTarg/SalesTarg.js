

let targetChart = null; 
const formatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });    

// Function to fetch data and process the sales data for chart and table
async function SalesTarget(cStorname='',dTargDate='') {
    // const formatter = new Intl.NumberFormat('en-US'); // 'en-US' for U.S. formatting
    
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
        document.getElementById('labelDataTabl3').innerText=`Projected Sales: ${formatter.format(targsale)}`
        
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


async function storeTargets(cStoreGrp='') {
    const table = document.getElementById('salesTargetTable');
    const tableBody = table.querySelector('tbody');
    tableBody.innerHTML = ''; // Clear any existing rows

    // Create the table header with template literals (only once)
    if (!table.querySelector('thead')) {
        const headerHTML = `
            <thead>
                <tr>
                    <th></th>
                    <th>Store Name</th>
                    <th>Projected Sales</th>
                    <th>Starting Date</th>
                    <th>Target Date</th>
                    <th>As Of Date</th>
                    <th>Actual Sales</th>
                    <th>Achievement (%) on Projected Sales</th>
                </tr>
            </thead>
        `;
        table.insertAdjacentHTML('afterbegin', headerHTML); // Insert the header at the start of the table
    }

    const dataTarget = "./SalesTarg/DB_SALEACHV.json";

    try {
        const response = await fetch(dataTarget);
        if (!response.ok) throw new Error('Network response was not ok');
    
        let detailTargets = await response.json();
        // detailTargets = detailTargets.filter((cGrp) => cGrp.storegrp === cStoreGrp);

   
        detailTargets.sort((a, b) => {
            // Split begindte to get the individual components (MM/DD/YYYY)
            const [monthA, dayA, yearA] = a.begindte.split('/').map(Number);
            const [monthB, dayB, yearB] = b.begindte.split('/').map(Number);
        
            // Create Date objects using the components in the correct order
            const dateA = new Date(yearA, monthA - 1, dayA); // Month is zero-indexed
            const dateB = new Date(yearB, monthB - 1, dayB);
       
            // Sort by begindte (date) first (descending order)
            if (dateA > dateB) return -1; // Older dates first
            if (dateA < dateB) return 1;  // Newer dates last


            // If begindte is the same, sort by storname in ascending order
            if (a.storname < b.storname) return -1;
            if (a.storname > b.storname) return 1;
        
            return 0;  // If both date and storname are the same, maintain original order
        });
        

        // Group data by storname and targdate
        const groupedData = detailTargets.reduce((acc, item) => {
            const key = `${item.storname}-${item.targdate}`;
            if (!acc[key]) {
                acc[key] = {
                    storname: item.storname,
                    targsale: item.targsale,
                    begindte: item.begindte,
                    targdate: item.targdate,
                    asofdate: item.datesale, // Initialize with the first date
                    storegrp: item.storegrp,
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
        
        // Convert the groupedData back to an array
        const sortedData = Object.values(groupedData);

        // Add rows to the table
        sortedData.forEach((item,index) => {
            if (cStoreGrp && cStoreGrp !== 'All Business Group' && item.storegrp !== cStoreGrp) {
                return; // Skip if the group doesn't match
            }
    
            const isItalic = item.targsale < item.totalnet ? 'font-style: italic; font-weight: bold' : '';

            const rowHTML = `
                <tr class="trTargetDiv" data-storname="${item.storname}" data-targdate="${item.targdate}" style="${isItalic}">
                    <td>${index+1}</td>
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

async function populateStoreGrp() {
    const dataTarget = "./SalesTarg/DB_SALEACHV.json";
    const listGrup = document.getElementById('storeGroup');
    try {
        const response = await fetch(dataTarget);
        if (!response.ok) throw new Error('Network response was not ok');
    
        const detailTargets = await response.json();

        // Create and insert a All Group option as the first item
        const allGrupOption = document.createElement('option');
        allGrupOption.value = ''; // No value for the first option
        allGrupOption.textContent = 'All Business Group'; // Text for the first option
        listGrup.appendChild(allGrupOption);

        const seenGroupNames = new Set();
        detailTargets.forEach(data => {
            // Populate Business Groups
            if (!seenGroupNames.has(data.storegrp)) {
                seenGroupNames.add(data.storegrp);
        
                const option1 = document.createElement('option');
                option1.value = data.storegrp;
                option1.textContent = data.storegrp;
                listGrup.appendChild(option1);
            }
        })
    

    } catch (error) {
        console.error('Error fetching data:', error);
    }

    listGrup.addEventListener('change', () => {
        const selectedGroup = listGrup.value;
        storeTargets(selectedGroup);
    });
    
}


populateStoreGrp()
storeTargets('');

function populateTable(filteredData, runtotal, pctachvd) {
    // const formatter = new Intl.NumberFormat('en-US'); // 'en-US' for U.S. formatting
    const table = document.getElementById('salesDataTable');
    const tableBody = table.querySelector('tbody');
    const tableFooter = table.querySelector('tfoot');
    
    tableBody.innerHTML = ''; // Clear any existing rows

    // Create the table header with template literals (only once)
    if (!table.querySelector('thead')) { 
        const headerHTML = `
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Daily Net Sales</th>
                    <th>Running Daily Target</th>
                    <th>Running Total Sales</th>
                    <th>Achievement (%) on Projected Sales</th>
                </tr>
            </thead>
        `;
        table.insertAdjacentHTML('afterbegin', headerHTML); // Insert the header at the start of the table
    }

    // Create the rows for the body using template literals
    let totalNet = 0;
    let lastRunTarg = 0;
    let lastRuntotal = 0;
    let lastPctAchvd = 0;

    filteredData.forEach((item, index) => {
        if (item.netsales === 0) return;
        
        let dDateSale = new Date(item.datesale);
        
        totalNet += item.netsales;

        // Update the last row data
        lastRunTarg = item.run_targ;
        lastRuntotal = runtotal[index] || 0;
        lastPctAchvd = pctachvd[index] ? pctachvd[index] : 0;

        const rowHTML = `
            <tr id="trTableDiv">
                <td id="tdDateSale">${formatDate(dDateSale)}</td> 
                <td id="tdNetSales" style="text-align: right; padding-right: 10px">${formatter.format(item.netsales.toFixed(2))}</td> 
                <td id="tdRun_Targ" style="text-align: right; padding-right: 10px">${formatter.format(item.run_targ.toFixed(2))}</td> 
                <td id="tdRunTotal" style="text-align: right; padding-right: 10px">${formatter.format(runtotal[index].toFixed(2)) || '-'}</td> 
                <td id="tdPctAchvd" style="text-align: right; padding-right: 10px">${pctachvd[index] ? pctachvd[index].toFixed(2) + '%' : '-'}</td> 
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', rowHTML); // Append the row to the tbody
    });
    

    // Check if footer is already present, otherwise add it
    if (!tableFooter) {
        const footerHTML = `
            <tr></tr>
            <tfoot>
                <tr style="height: 50px">
                    <td style="text-align: right"><strong>Total</strong></td>
                    <td style="font-weight: bold; text-align: right; padding-right: 10px">${formatter.format(totalNet.toFixed(2))}</td> 
                    <td style="font-weight: bold; text-align: right; padding-right: 10px">${formatter.format(lastRunTarg.toFixed(2))}</td> 
                    <td style="font-weight: bold; text-align: right; padding-right: 10px">${formatter.format(lastRuntotal.toFixed(2))}</td> 
                    <td style="font-weight: bold; text-align: right; padding-right: 10px">${lastPctAchvd ? lastPctAchvd.toFixed(2) + '%' : '-'}</td> 
                </tr>
            </tfoot>
        `;
        table.insertAdjacentHTML('beforeend', footerHTML); // Insert the footer at the end of the table
    } else {
        // Update the footer if already exists
        tableFooter.innerHTML = `
            <tr style="height: 50px">
                <td style="text-align: right";><strong>Total</strong></td>
                <td style="font-weight: bold; text-align: right; padding-right: 10px">${formatter.format(totalNet.toFixed(2))}</td> 
                <td style="font-weight: bold; text-align: right; padding-right: 10px">${formatter.format(lastRunTarg.toFixed(2))}</td> 
                <td style="font-weight: bold; text-align: right; padding-right: 10px">${formatter.format(lastRuntotal.toFixed(2))}</td> 
                <td style="font-weight: bold; text-align: right; padding-right: 10px">${lastPctAchvd ? lastPctAchvd.toFixed(2) + '%' : '-'}</td> 
            </tr>
        `;
    }

}

function formatDate(date) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = dayNames[date.getDay()];
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).padStart(4, '0');
    return `${month}/${day}/${year} -${dayOfWeek}`;
}

// Now for window.onload, sort salesAchv similarly
window.onload = async () => {
    const dataTarget = "./SalesTarg/DB_SALEACHV.json"; // Path to the JSON data file

    try {
        // Fetch the data
        const response = await fetch(dataTarget);
        if (!response.ok) throw new Error('Network response was not ok');

        const salesAchv = await response.json(); // Parse the JSON data

        // Sort the salesAchv array first by begindte (ascending), then by storname (ascending)
        const sortedSalesAchv = salesAchv.sort((a, b) => {
            // Split begindte to get the individual components (MM/DD/YYYY)
            const [monthA, dayA, yearA] = a.begindte.split('/').map(Number);
            const [monthB, dayB, yearB] = b.begindte.split('/').map(Number);

            // Create Date objects using the components in the correct order
            const dateA = new Date(yearA, monthA - 1, dayA); // Month is zero-indexed
            const dateB = new Date(yearB, monthB - 1, dayB);

            // Sort by begindte (date) first (ascending order)
            // if (dateA < dateB) return -1; // Older dates first
            // if (dateA > dateB) return 1;  // Newer dates last
            if (dateA > dateB) return -1; // Older dates first
            if (dateA < dateB) return 1;  // Newer dates last

            // If begindte is the same, sort by storname in ascending order
            if (a.storname < b.storname) return -1;
            if (a.storname > b.storname) return 1;

            return 0;  // If both date and storname are the same, maintain original order
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
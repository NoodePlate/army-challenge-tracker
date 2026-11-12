// ======================================================
// APP CONFIGURATION
// ======================================================

const STORAGE_KEY = "armyChallengeLogs";
const START_DATE = "2026-10-24";
const END_DATE = "2026-12-20";

const ACTIVITIES = {
    run: {
        name: "Running",
        target: 60,
        unit: "km",
        decimals: 2,
        canvasId: "runChart",
        completedId: "runCompleted",
        remainingId: "runRemaining",
        dailyId: "runDaily",
        weeklyId: "runWeekly",
        todayColour: "#ef4444"
    },

    pushup: {
        name: "Push-ups",
        target: 600,
        unit: "reps",
        decimals: 0,
        canvasId: "pushupChart",
        completedId: "pushupCompleted",
        remainingId: "pushupRemaining",
        dailyId: "pushupDaily",
        weeklyId: "pushupWeekly",
        todayColour: "#22c55e"
    },

    situp: {
        name: "Sit-ups",
        target: 600,
        unit: "reps",
        decimals: 0,
        canvasId: "situpChart",
        completedId: "situpCompleted",
        remainingId: "situpRemaining",
        dailyId: "situpDaily",
        weeklyId: "situpWeekly",
        todayColour: "#a855f7"
    }
};

const charts = {};


// ======================================================
// APP START-UP
// ======================================================

window.addEventListener("DOMContentLoaded", function () {
    setCurrentDateTime();

    document
        .getElementById("saveBtn")
        .addEventListener("click", saveEntry);
    document
        .getElementById("exportBtn")
        .addEventListener("click", exportData);

    document
        .getElementById("importBtn")
        .addEventListener("click", function () {
            document.getElementById("importFile").click();
        });

    document
        .getElementById("importFile")
        .addEventListener("change", importData);

    refreshApp();
});


// ======================================================
// LOCAL STORAGE
// ======================================================

function getLogs() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
        console.error("Unable to read saved logs:", error);
        return [];
    }
}

function saveLogs(logs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function exportData() {
    const logs = getLogs();

    const backup = {
        app: "Army Challenge Tracker",
        version: 1,
        exportedAt: new Date().toISOString(),
        logs: logs
    };

    const fileContents = JSON.stringify(
        backup,
        null,
        2
    );

    const blob = new Blob(
        [fileContents],
        { type: "application/json" }
    );

    const downloadUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download =
        `army-challenge-backup-${formatLocalDate(new Date())}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(downloadUrl);
}

function importData(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function () {
        try {
            const imported = JSON.parse(reader.result);

            const importedLogs = Array.isArray(imported)
                ? imported
                : imported.logs;

            if (!Array.isArray(importedLogs)) {
                throw new Error("Backup does not contain a logs array.");
            }

            const validLogs = importedLogs.filter(entry => {
                const hasValidDateTime =
                    typeof entry.datetime === "string";

                const hasActivity =
                    typeof entry.run === "number" ||
                    typeof entry.pushup === "number" ||
                    typeof entry.situp === "number";

                return hasValidDateTime && hasActivity;
            });

            if (validLogs.length === 0) {
                alert("No valid exercise records were found.");
                return;
            }

            const existingLogs = getLogs();

            /*
             * Merge existing phone records with imported desktop records.
             * JSON strings are used to remove exact duplicate records.
             */
            const mergedMap = new Map();

            [...existingLogs, ...validLogs].forEach(entry => {
                mergedMap.set(
                    JSON.stringify(entry),
                    entry
                );
            });

            const mergedLogs =
                Array.from(mergedMap.values());

            mergedLogs.sort((firstEntry, secondEntry) =>
                firstEntry.datetime.localeCompare(
                    secondEntry.datetime
                )
            );

            saveLogs(mergedLogs);
            refreshApp();

            alert(
                `${validLogs.length} records imported successfully.`
            );
        } catch (error) {
            console.error(error);
            alert("The selected backup file is invalid.");
        } finally {
            event.target.value = "";
        }
    };

    reader.readAsText(file);
}

// ======================================================
// DATE HELPERS
// ======================================================

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatLocalDateTime(date) {
    const datePart = formatLocalDate(date);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${datePart}T${hours}:${minutes}`;
}

function parseLocalDate(dateString) {
    const [year, month, day] = dateString
        .split("-")
        .map(Number);

    return new Date(year, month - 1, day);
}

function setCurrentDateTime() {
    document.getElementById("datetime").value =
        formatLocalDateTime(new Date());
}

function generateDateRange(startDate, endDate) {
    const dates = [];
    const currentDate = parseLocalDate(startDate);
    const finalDate = parseLocalDate(endDate);

    while (currentDate <= finalDate) {
        dates.push(formatLocalDate(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
}

function formatChartDate(dateString) {
    const date = parseLocalDate(dateString);

    return date.toLocaleDateString("en-SG", {
        day: "2-digit",
        month: "short"
    });
}

function getDaysRemaining() {
    const today = parseLocalDate(formatLocalDate(new Date()));
    const deadline = parseLocalDate(END_DATE);
    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    return Math.max(
        0,
        Math.floor(
            (deadline - today) / millisecondsPerDay
        ) + 1
    );
}


// ======================================================
// APP REFRESH
// ======================================================

function refreshApp() {
    displayEntries();
    displaySummary();
    drawAllCharts();
}


// ======================================================
// SAVE AND DELETE ENTRIES
// ======================================================

function saveEntry() {
    const datetime =
        document.getElementById("datetime").value;

    const runValue =
        document.getElementById("run").value;

    const pushupValue =
        document.getElementById("pushup").value;

    const situpValue =
        document.getElementById("situp").value;

    if (!datetime) {
        alert("Please select a date and time.");
        return;
    }

    const entry = {
        datetime: datetime
    };

    if (runValue !== "") {
        const run = Number.parseFloat(runValue);

        if (!Number.isFinite(run) || run < 0) {
            alert("Please enter a valid running distance.");
            return;
        }

        entry.run = run;
    }

    if (pushupValue !== "") {
        const pushup = Number.parseInt(pushupValue, 10);

        if (!Number.isInteger(pushup) || pushup < 0) {
            alert("Please enter a valid push-up count.");
            return;
        }

        entry.pushup = pushup;
    }

    if (situpValue !== "") {
        const situp = Number.parseInt(situpValue, 10);

        if (!Number.isInteger(situp) || situp < 0) {
            alert("Please enter a valid sit-up count.");
            return;
        }

        entry.situp = situp;
    }

    const hasActivity =
        entry.run !== undefined ||
        entry.pushup !== undefined ||
        entry.situp !== undefined;

    if (!hasActivity) {
        alert("Please enter at least one activity.");
        return;
    }

    const logs = getLogs();

    logs.push(entry);

    logs.sort((firstEntry, secondEntry) =>
        firstEntry.datetime.localeCompare(
            secondEntry.datetime
        )
    );

    saveLogs(logs);
    clearActivityInputs();
    setCurrentDateTime();
    refreshApp();

    alert("Entry saved!");
}

function deleteEntry(index) {
    const logs = getLogs();

    if (!confirm("Delete this entry?")) {
        return;
    }

    logs.splice(index, 1);
    saveLogs(logs);
    refreshApp();
}

function clearActivityInputs() {
    document.getElementById("run").value = "";
    document.getElementById("pushup").value = "";
    document.getElementById("situp").value = "";
}


// ======================================================
// SAVED ENTRIES DISPLAY
// ======================================================

function displayEntries() {
    const entriesDiv =
        document.getElementById("entries");

    const logs = getLogs();

    entriesDiv.innerHTML = "";

    if (logs.length === 0) {
        entriesDiv.innerHTML =
            "<p>No entries saved yet.</p>";

        return;
    }

    logs
        .map((entry, originalIndex) => ({
            entry,
            originalIndex
        }))
        .reverse()
        .forEach(({ entry, originalIndex }) => {
            const card = document.createElement("div");
            card.className = "entry-card";

            const date = new Date(entry.datetime);

            const formattedDate = date.toLocaleString(
                "en-SG",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

            let html = `<strong>${formattedDate}</strong><br>`;

            if (entry.run !== undefined) {
                html += `Run: ${entry.run} km<br>`;
            }

            if (entry.pushup !== undefined) {
                html += `Push-ups: ${entry.pushup}<br>`;
            }

            if (entry.situp !== undefined) {
                html += `Sit-ups: ${entry.situp}<br>`;
            }

            html += `
                <button
                    type="button"
                    class="delete-entry-button"
                    data-index="${originalIndex}">
                    Delete
                </button>
            `;

            card.innerHTML = html;
            entriesDiv.appendChild(card);
        });

    entriesDiv
        .querySelectorAll(".delete-entry-button")
        .forEach(button => {
            button.addEventListener("click", function () {
                const index = Number(this.dataset.index);
                deleteEntry(index);
            });
        });
}


// ======================================================
// SUMMARY
// ======================================================

function calculateTotals() {
    const logs = getLogs();

    const totals = {
        run: 0,
        pushup: 0,
        situp: 0
    };

    logs.forEach(entry => {
        Object.keys(ACTIVITIES).forEach(activityKey => {
            totals[activityKey] +=
                entry[activityKey] ?? 0;
        });
    });

    return totals;
}

function displaySummary() {
    const totals = calculateTotals();
    const daysRemaining = getDaysRemaining();

    Object.entries(ACTIVITIES).forEach(
        ([activityKey, activity]) => {
            const completed = totals[activityKey];

            const remaining = Math.max(
                0,
                activity.target - completed
            );

            let dailyRequired = null;

            if (daysRemaining > 0) {
                dailyRequired =
                    remaining / daysRemaining;
            } else if (remaining === 0) {
                dailyRequired = 0;
            }

            const weeklyRequired =
                dailyRequired === null
                    ? null
                    : dailyRequired * 7;

            document.getElementById(
                activity.completedId
            ).textContent = completed.toFixed(
                activity.decimals
            );

            document.getElementById(
                activity.remainingId
            ).textContent = remaining.toFixed(
                activity.decimals
            );

            document.getElementById(
                activity.dailyId
            ).textContent =
                dailyRequired === null
                    ? "Deadline passed"
                    : dailyRequired.toFixed(2);

            document.getElementById(
                activity.weeklyId
            ).textContent =
                weeklyRequired === null
                    ? "Deadline passed"
                    : weeklyRequired.toFixed(2);
        }
    );

    document.getElementById(
        "daysRemaining"
    ).textContent = daysRemaining;
}


// ======================================================
// REUSABLE CHART DATA FUNCTIONS
// ======================================================

function generateTargetData(target, dates) {
    return dates.map((date, index) =>
        (target / (dates.length - 1)) * index
    );
}

function getCumulativeData(activityKey, dates) {
    const logs = getLogs();
    const todayString = formatLocalDate(new Date());

    let total = 0;

    return dates.map(date => {
        logs.forEach(entry => {
            const entryDate =
                entry.datetime.split("T")[0];

            if (
                entryDate === date &&
                entry[activityKey] !== undefined
            ) {
                total += entry[activityKey];
            }
        });

        if (date > todayString) {
            return null;
        }

        return total;
    });
}

function getProjectionData(
    target,
    dates,
    cumulativeData
) {
    const todayString = formatLocalDate(new Date());
    const todayIndex = dates.indexOf(todayString);

    const projectionData = dates.map(() => null);

    // Today is outside the challenge period
    if (todayIndex === -1) {
        return projectionData;
    }

    const currentTotal = cumulativeData[todayIndex] ?? 0;

    /*
     * Number of elapsed activity days, including today.
     *
     * Example:
     * Index 0 = first challenge day
     * Index 19 = 20 elapsed challenge days
     */
    const elapsedDays = todayIndex + 1;

    const actualDailyAverage =
        elapsedDays > 0
            ? currentTotal / elapsedDays
            : 0;

    /*
     * Include today's actual point so that the solid
     * Actual line connects to the dashed Projection line.
     */
    projectionData[todayIndex] = currentTotal;

    /*
     * Continue from today using the actual daily average.
     * The projection is no longer forced to reach the target.
     */
    for (
        let index = todayIndex + 1;
        index < dates.length;
        index++
    ) {
        const futureDays = index - todayIndex;

        projectionData[index] =
            currentTotal +
            (futureDays * actualDailyAverage);
    }

    return projectionData;
}

function getEntryPointRadius(
    activityKey,
    dates
) {
    const logs = getLogs();

    return dates.map(date => {
        const hasEntry = logs.some(entry => {
            const entryDate =
                entry.datetime.split("T")[0];

            return (
                entryDate === date &&
                entry[activityKey] !== undefined
            );
        });

        return hasEntry ? 4 : 0;
    });
}

function getTodayPointData(
    dates,
    cumulativeData
) {
    const todayString = formatLocalDate(new Date());

    return dates.map((date, index) => {
        if (date === todayString) {
            return cumulativeData[index] ?? 0;
        }

        return null;
    });
}


// ======================================================
// REUSABLE CHART CREATION
// ======================================================

function drawAllCharts() {
    Object.entries(ACTIVITIES).forEach(
        ([activityKey, activity]) => {
            drawActivityChart(
                activityKey,
                activity
            );
        }
    );
}

function drawActivityChart(
    activityKey,
    activity
) {
    const dates = generateDateRange(
        START_DATE,
        END_DATE
    );

    const targetData = generateTargetData(
        activity.target,
        dates
    );

    const cumulativeData = getCumulativeData(
        activityKey,
        dates
    );

    const projectionData = getProjectionData(
        activity.target,
        dates,
        cumulativeData
    );

    const todayPointData = getTodayPointData(
        dates,
        cumulativeData
    );

    const pointRadii = getEntryPointRadius(
        activityKey,
        dates
    );

    if (charts[activityKey]) {
        charts[activityKey].destroy();
    }

    const canvas =
        document.getElementById(activity.canvasId);

    const context = canvas.getContext("2d");

    charts[activityKey] = new Chart(context, {
        type: "line",

        data: {
            labels: dates,

            datasets: [
                {
                    label: "Target",
                    data: targetData,
                    borderColor: "#1d4ed8",
                    backgroundColor: "#1d4ed8",
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                },

                {
                    label: "Actual",
                    data: cumulativeData,
                    borderColor: "#f59e0b",
                    backgroundColor: "#f59e0b",
                    borderWidth: 3,
                    pointRadius: pointRadii,
                    pointHoverRadius: 8,
                    pointBackgroundColor: "#f59e0b",
                    pointBorderColor: "#f59e0b",
                    spanGaps: false,
                    order: 1
                },

                {
                    label: "Today",
                    data: todayPointData,
                    borderWidth: 0,
                    pointRadius: 7,
                    pointHoverRadius: 10,
                    pointBackgroundColor:
                        activity.todayColour,
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    showLine: false,
                    order: 0
                },

                {
                    label: "Projection",
                    data: projectionData,
                    borderColor: "#f59e0b",
                    backgroundColor: "#f59e0b",
                    borderWidth: 3,
                    borderDash: [8, 6],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    spanGaps: false
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                mode: "index",
                intersect: false
            },

            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        boxWidth: 40,
                        padding: 8,

                        generateLabels: function (chart) {
                            const labels =
                                Chart.defaults.plugins.legend.labels
                                    .generateLabels(chart);

                            labels.forEach(label => {
                                const dataset =
                                    chart.data.datasets[label.datasetIndex];

                                if (dataset.label === "Today") {
                                    label.pointStyle = "circle";
                                    label.pointStyleWidth = 12;
                                    label.fillStyle =
                                        dataset.pointBackgroundColor;
                                    label.strokeStyle =
                                        dataset.pointBackgroundColor;
                                    label.lineWidth = 0;
                                    label.lineDash = [];
                                } else {
                                    label.pointStyle = "line";
                                    label.pointStyleWidth = 40;
                                    label.fillStyle =
                                        dataset.borderColor;
                                    label.strokeStyle =
                                        dataset.borderColor;
                                    label.lineWidth =
                                        dataset.borderWidth || 3;
                                    label.lineDash =
                                        dataset.borderDash || [];
                                }
                            });

                            return labels;
                        }
                    }
                },

                tooltip: {
                    callbacks: {
                        title: function (items) {
                            return formatChartDate(items[0].label);
                        },

                        label: function (context) {
                            if (context.raw === null) {
                                return null;
                            }

                            const value =
                                Number(context.raw).toFixed(
                                    activity.decimals
                                );

                            return `${context.dataset.label}: ` +
                                `${value} ${activity.unit}`;
                        }
                    }
                }
            },

            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 9
                        },
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 7,

                        callback: function (tickValue) {
                            const originalDate =
                                this.getLabelForValue(tickValue);

                            return formatChartDate(originalDate);
                        }
                    }
                },

                y: {
                    beginAtZero: true,
                    suggestedMax: activity.target,

                    ticks: {
                        font: {
                            size: 9
                        }
                    },

                    title: {
                        display: true,
                        text: activity.unit,
                        font: {
                            size: 9
                        }
                    }
                }
            }
        }
    });
}
const API_BASE = "http://localhost:3000";

// ---- Helper ----
async function makeRequest(url, options = {}) {
    try {
        const r = await fetch(url, options);
        const data = await r.json();
        return { success: true, data, status: r.status };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function displayResponse(id, result) {
    document.getElementById(id).innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
}

// ---- Normal Requests ----
async function testSuccess() {
    const r = await makeRequest(`${API_BASE}/api/demo/success`);
    displayResponse("response-normal", r);
}

async function testNotFound() {
    const r = await makeRequest(`${API_BASE}/api/demo/not-found`);
    displayResponse("response-normal", r);
}

async function testError() {
    const r = await makeRequest(`${API_BASE}/api/demo/error`);
    displayResponse("response-normal", r);
}

async function testSlow() {
    document.getElementById("response-normal").innerHTML = "<div class=\"loading\"></div> 3s...";
    const r = await makeRequest(`${API_BASE}/api/demo/slow`);
    displayResponse("response-normal", r);
}

// ---- Security Attacks ----
async function testSQLInjection() {
    const r = await makeRequest(`${API_BASE}/api/demo/sql-injection?query=SELECT * FROM users--`);
    displayResponse("response-security", r);
    setTimeout(viewStats, 800);
}

async function testXSS() {
    const r = await makeRequest(`${API_BASE}/api/demo/xss`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ comment: "<script>alert(\"xss\")</script>" })
    });
    displayResponse("response-security", r);
    setTimeout(viewStats, 800);
}

async function testBruteForce() {
    const r = await makeRequest(`${API_BASE}/api/demo/brute-force`, { method: "POST" });
    displayResponse("response-security", r);
    setTimeout(viewStats, 800);
}

async function testUnauthorized() {
    const r = await makeRequest(`${API_BASE}/api/demo/unauthorized`);
    displayResponse("response-security", r);
}

// ---- Login ----
async function testFailedLogin() {
    const email = document.getElementById("login-email").value;
    const r = await makeRequest(`${API_BASE}/api/demo/login-fail`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email })
    });
    displayResponse("response-login", r);
    setTimeout(viewStats, 800);
}

async function testSuccessLogin() {
    const email = document.getElementById("login-email").value;
    const r = await makeRequest(`${API_BASE}/api/demo/login-success`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email })
    });
    displayResponse("response-login", r);
}

// ---- Logs ----
async function viewLogs() {
    const type = document.getElementById("log-type").value;
    const level = document.getElementById("log-level").value;
    const limit = document.getElementById("log-limit").value;
    let url = `${API_BASE}/api/admin/logs?type=${type}&limit=${limit}`;
    if (level) url += `&level=${level}`;

    const result = await makeRequest(url);
    if (result.success && result.data.logs) {
        const html = result.data.logs.map(log => {
            const levelClass = log.level === "error" ? "error" : log.level === "warn" ? "warning" : "info";
            const badgeClass = log.level === "error" ? "badge-error" : log.level === "warn" ? "badge-warning" : "badge-info";
            return `
            <div class="log-entry ${levelClass}">
                <span class="badge ${badgeClass}">${(log.level || "").toUpperCase()}</span>
                <strong>${log.message || log.event || "No message"}</strong><br>
                <small>${log.timestamp || ""} | IP: ${log.ip || "N/A"} | User: ${log.userId || "anonymous"} | ${log.method || ""} ${log.url || ""}</small>
            </div>`;
        }).join("");
        document.getElementById("response-logs").innerHTML = html || "<p>No logs</p>";
    } else {
        displayResponse("response-logs", result);
    }
}

// ---- Stats ----
async function viewStats() {
    const r = await makeRequest(`${API_BASE}/api/admin/logs/stats`);
    if (r.success && r.data.stats) {
        const s = r.data.stats;
        document.getElementById("stat-total").textContent = s.total || 0;
        document.getElementById("stat-errors").textContent = s.byLevel?.error || 0;
        document.getElementById("stat-warnings").textContent = s.byLevel?.warn || 0;
        document.getElementById("stat-security").textContent = s.securityEvents?.length || 0;

        if (s.securityEvents && s.securityEvents.length > 0) {
            const html = s.securityEvents.slice(0, 8).map(e => `
            <div class="log-entry warning">
                <span class="badge badge-warning">SECURITY</span>
                <strong>${e.message || e.event}</strong><br>
                <small>${e.timestamp || ""} | IP: ${e.ip || "N/A"} | ${e.severity ? "Severity: " + e.severity : ""}</small>
            </div>`).join("");
            document.getElementById("recent-logs").innerHTML = html;
        } else {
            document.getElementById("recent-logs").innerHTML = "<p style=\"text-align:center;color:#999\">No security events yet</p>";
        }
    }
}

// ---- Clear Logs ----
async function clearLogs() {
    if (confirm("Xóa hết logs luôn nha?")) {
        const r = await makeRequest(`${API_BASE}/api/admin/logs/all`, { method: "DELETE" });
        alert(r.data?.message || "Đã xóa!");
        viewStats();
        document.getElementById("response-logs").innerHTML = "";
    }
}

// ---- Auto-refresh stats ----
setInterval(viewStats, 5000);
viewStats();

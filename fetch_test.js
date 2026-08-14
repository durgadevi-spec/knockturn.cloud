fetch('http://127.0.0.1:5004/api/insights/timesheet-status?employeeCode=E0048&year=2026&month=8')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

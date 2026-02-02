/**
 * CMS - Salary & Finance
 * Nurse: fixed monthly; Doctor: per consultation; daily income/expenses; admin summary.
 */

/**
 * Add salary record (Admin). Type: 'Nurse' (fixed monthly) or 'Doctor' (per consultation).
 */
function addSalary(sessionToken, userId, month, year, amount, type) {
  var session = getSessionFromToken(sessionToken);
  if (!session || session.role !== 'Admin') return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Salaries');
  if (!sh) return { error: 'Salaries sheet not found' };
  var m = parseInt(month, 10);
  var y = parseInt(year, 10);
  var amt = parseFloat(amount);
  if (isNaN(m) || isNaN(y) || isNaN(amt) || amt < 0) return { error: 'Invalid month/year/amount.' };
  if (type !== 'Nurse' && type !== 'Doctor') return { error: 'Type must be Nurse or Doctor.' };
  var row = [generateId(), userId, m, y, amt, type, new Date().toISOString()];
  sh.appendRow(row);
  return { success: true };
}

/**
 * Get salaries for a month/year or for a user (Admin).
 */
function getSalaries(sessionToken, month, year, userId) {
  var session = getSessionFromToken(sessionToken);
  if (!session || session.role !== 'Admin') return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Salaries');
  var userSh = ss.getSheetByName('Users');
  if (!sh || !userSh) return { error: 'Sheets not found' };
  var data = sh.getDataRange().getValues();
  var userData = userSh.getDataRange().getValues();
  var headers = data[0];
  var userH = userData[0];
  var nameIdx = userH.indexOf('Name');
  var uidIdx = userH.indexOf('UserId');
  var monthIdx = headers.indexOf('Month');
  var yearIdx = headers.indexOf('Year');
  var userIdIdx = headers.indexOf('UserId');
  var amountIdx = headers.indexOf('Amount');
  var typeIdx = headers.indexOf('Type');
  var list = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (month != null && row[monthIdx] != month) continue;
    if (year != null && row[yearIdx] != year) continue;
    if (userId && row[userIdIdx] !== userId) continue;
    var name = '';
    for (var u = 1; u < userData.length; u++) {
      if (userData[u][uidIdx] === row[userIdIdx]) { name = userData[u][nameIdx] || ''; break; }
    }
    list.push({
      salaryId: row[headers.indexOf('SalaryId')],
      userId: row[userIdIdx],
      name: name,
      month: row[monthIdx],
      year: row[yearIdx],
      amount: row[amountIdx],
      type: row[typeIdx]
    });
  }
  return { salaries: list };
}

/**
 * Add daily expense (Admin).
 */
function addExpense(sessionToken, description, amount, dateStr) {
  var session = getSessionFromToken(sessionToken);
  if (!session || session.role !== 'Admin') return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Expenses');
  if (!sh) return { error: 'Expenses sheet not found' };
  var amt = parseFloat(amount);
  if (isNaN(amt) || amt < 0) return { error: 'Invalid amount.' };
  var date = dateStr ? new Date(dateStr) : new Date();
  var row = [generateId(), description || '', amt, date.toISOString().split('T')[0], new Date().toISOString()];
  sh.appendRow(row);
  return { success: true };
}

/**
 * Get expenses (Admin). Optional date range.
 */
function getExpenses(sessionToken, fromDate, toDate) {
  var session = getSessionFromToken(sessionToken);
  if (!session || session.role !== 'Admin') return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Expenses');
  if (!sh) return { error: 'Sheet not found' };
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var dateIdx = headers.indexOf('Date');
  var amountIdx = headers.indexOf('Amount');
  var descIdx = headers.indexOf('Description');
  var from = fromDate ? new Date(fromDate).getTime() : 0;
  var to = toDate ? new Date(toDate).getTime() : Number.MAX_VALUE;
  var list = [];
  for (var i = 1; i < data.length; i++) {
    var d = new Date(data[i][dateIdx]).getTime();
    if (d < from || d > to) continue;
    list.push({
      expenseId: data[i][headers.indexOf('ExpenseId')],
      description: data[i][descIdx],
      amount: data[i][amountIdx],
      date: data[i][dateIdx]
    });
  }
  list.sort(function(a, b) { return new Date(b.date).getTime() - new Date(a.date).getTime(); });
  return { expenses: list };
}

/**
 * Daily clinic income = sum of Billing.Amount for that day (Admin).
 */
function getDailyIncome(sessionToken, dateStr) {
  var session = getSessionFromToken(sessionToken);
  if (!session || session.role !== 'Admin') return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Billing');
  if (!sh) return { income: 0, bills: [] };
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var createdIdx = headers.indexOf('CreatedAt');
  var amountIdx = headers.indexOf('Amount');
  var dateOnly = (dateStr || '').split('T')[0];
  if (!dateOnly) dateOnly = new Date().toISOString().split('T')[0];
  var total = 0;
  var bills = [];
  for (var i = 1; i < data.length; i++) {
    var created = data[i][createdIdx];
    if (!created) continue;
    var c = created.toString().substring(0, 10);
    if (c === dateOnly) {
      var amt = parseFloat(data[i][amountIdx]) || 0;
      total += amt;
      bills.push({ amount: amt, createdAt: created });
    }
  }
  return { income: total, date: dateOnly, bills: bills };
}

/**
 * Doctor: view own earnings (sum of Billing for doctor in date range).
 */
function getMyEarnings(sessionToken, fromDate, toDate) {
  var session = getSessionFromToken(sessionToken);
  if (!session || session.role !== 'Doctor') return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Billing');
  if (!sh) return { earnings: 0, bills: [] };
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var doctorIdx = headers.indexOf('DoctorUserId');
  var amountIdx = headers.indexOf('Amount');
  var createdIdx = headers.indexOf('CreatedAt');
  var from = fromDate ? new Date(fromDate).getTime() : 0;
  var to = toDate ? new Date(toDate).getTime() : Number.MAX_VALUE;
  var total = 0;
  var bills = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][doctorIdx] !== session.userId) continue;
    var created = data[i][createdIdx];
    if (!created) continue;
    var t = new Date(created).getTime();
    if (t < from || t > to) continue;
    var amt = parseFloat(data[i][amountIdx]) || 0;
    total += amt;
    bills.push({ amount: amt, createdAt: created });
  }
  return { earnings: total, bills: bills };
}

/**
 * Admin dashboard summary: today's income, month expenses, salary totals.
 */
function getAdminDashboard(sessionToken) {
  var session = getSessionFromToken(sessionToken);
  if (!session || session.role !== 'Admin') return { error: 'Unauthorized' };
  var today = new Date().toISOString().split('T')[0];
  var monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  var monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
  var incomeToday = getDailyIncome(sessionToken, today);
  var expenses = getExpenses(sessionToken, monthStart, monthEnd);
  var salaries = getSalaries(sessionToken, new Date().getMonth() + 1, new Date().getFullYear(), null);
  var totalSalary = 0;
  if (salaries.salaries) {
    for (var i = 0; i < salaries.salaries.length; i++) totalSalary += parseFloat(salaries.salaries[i].amount) || 0;
  }
  var totalExpense = 0;
  if (expenses.expenses) {
    for (var j = 0; j < expenses.expenses.length; j++) totalExpense += parseFloat(expenses.expenses[j].amount) || 0;
  }
  return {
    incomeToday: incomeToday.income || 0,
    incomeDate: today,
    monthExpenses: totalExpense,
    monthSalaries: totalSalary,
    recentExpenses: (expenses.expenses || []).slice(0, 10),
    recentSalaries: (salaries.salaries || []).slice(0, 10)
  };
}

const dashboardRepository = require('./dashboard.repository');

class DashboardService {
  async getMainMetrics() {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 🚀 Consultas en paralelo para velocidad extrema
    const [
      incomeCurrent, expenseCurrent, incomePrev, expensePrev, pendingCurrent, activeClients, topDebtors, recurringProjection
    ] = await Promise.all([
      dashboardRepository.getSumByTypeAndDate('INCOME', 'PAID', startOfCurrentMonth, endOfCurrentMonth),
      dashboardRepository.getSumByTypeAndDate('EXPENSE', 'PAID', startOfCurrentMonth, endOfCurrentMonth),
      dashboardRepository.getSumByTypeAndDate('INCOME', 'PAID', startOfPrevMonth, endOfPrevMonth),
      dashboardRepository.getSumByTypeAndDate('EXPENSE', 'PAID', startOfPrevMonth, endOfPrevMonth),
      dashboardRepository.getSumByTypeAndDate('INCOME', 'PENDING', startOfCurrentMonth, endOfCurrentMonth),
      dashboardRepository.getActiveClientsCount(),
      dashboardRepository.getTopDebtors(),
      dashboardRepository.getRecurringIncomeProjection()
    ]);

    // Lógica para la Gráfica de 6 meses (Calculada en paralelo)
    const chartPromises = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      
      chartPromises.push(
        Promise.all([
          dashboardRepository.getMonthlySum('INCOME', 'PAID', year, month),
          dashboardRepository.getMonthlySum('EXPENSE', 'PAID', year, month),
          `${monthNames[month]} ${year}`
        ])
      );
    }
    
    const chartResults = await Promise.all(chartPromises);
    const chartData = chartResults.map(([income, expense, monthLabel]) => ({
      month: monthLabel,
      income,
      expense
    }));

    // Cálculos de negocio matemáticos
    const utilityCurrent = Number(incomeCurrent) - Number(expenseCurrent);
    const utilityPrev = Number(incomePrev) - Number(expensePrev);
    const incomeGrowth = incomePrev > 0 
  ? ((Number(incomeCurrent) - Number(incomePrev)) / Number(incomePrev)) * 100 
  : (Number(incomeCurrent) > 0 ? 100 : 0);
    const expenseGrowth = expensePrev > 0 ? ((expenseCurrent - expensePrev) / expensePrev) * 100 : (expenseCurrent > 0 ? 100 : 0);
    
    // KPI: Tasa de Cobranza (Cobrado / (Cobrado + Pendiente del mes actual))
    const totalBilled = Number(incomeCurrent) + Number(pendingCurrent);
    const collectionRate = totalBilled > 0 ? (Number(incomeCurrent) / totalBilled) * 100 : 0;

    return {
      financials: {
        currentMonth: { income: incomeCurrent, expense: expenseCurrent, utility: utilityCurrent },
        previousMonth: { income: incomePrev, expense: expensePrev, utility: utilityPrev },
        growth: { incomePct: incomeGrowth.toFixed(2), expensePct: expenseGrowth.toFixed(2) }
      },
      kpis: {
        activeClients,
        collectionRate: collectionRate.toFixed(2),
        pendingCollections: pendingCurrent,
        recurringProjection: recurringProjection
      },
      alerts: {
        top10Debtors: topDebtors,
        expiringDocuments: [] // Pendiente para el módulo de Documentos
      },
      chart: chartData
    };
  }
}

module.exports = new DashboardService();
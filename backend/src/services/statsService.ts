import { statsRepo } from '../repositories/statsRepo.js';
import type { DashboardStats, HeatmapData } from '../types/index.js';

export const statsService = {
  getDashboardStats(): DashboardStats {
    return {
      totalReadingTime: statsRepo.getTotalReadingTime(),
      booksRead: statsRepo.getBooksRead(),
      totalBooks: statsRepo.getTotalBooks(),
      currentStreak: statsRepo.getCurrentStreak(),
      weeklyReading: statsRepo.getWeeklyReading(),
      categoryDistribution: statsRepo.getCategoryDistribution(),
    };
  },

  getHeatmap(year?: number): HeatmapData[] {
    return statsRepo.getHeatmap(year);
  },
};

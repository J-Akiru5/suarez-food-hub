import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency } from "@repo/utils";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1f2937",
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#b1454a",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#b1454a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  dateRange: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  statsGrid: {
    display: "flex",
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: "#fdf2f3",
    borderRadius: 8,
    border: "1px solid #f9d0d3",
  },
  statLabel: {
    fontSize: 8,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    backgroundColor: "#fdf2f3",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableCell: {
    fontSize: 9,
    color: "#374151",
  },
  footer: {
    marginTop: 30,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    textAlign: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
  },
  brandAccent: {
    color: "#b1454a",
  },
});

interface ReportProps {
  dateFrom: string;
  dateTo: string;
  data: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    itemsSold: number;
    dailyBreakdown: { date: string; revenue: number; orders: number }[];
    topProducts: { name: string; quantity: number; revenue: number }[];
  };
}

export default function PdfReport({ dateFrom, dateTo, data }: ReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Suarez Food Hub</Text>
          <Text style={styles.subtitle}>Business Report</Text>
          <Text style={styles.dateRange}>
            {dateFrom} to {dateTo}
          </Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Orders</Text>
              <Text style={styles.statValue}>{data.totalOrders}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Revenue</Text>
              <Text style={styles.statValue}>{formatCurrency(data.totalRevenue)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Avg. Order Value</Text>
              <Text style={styles.statValue}>{formatCurrency(data.averageOrderValue)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Items Sold</Text>
              <Text style={styles.statValue}>{data.itemsSold}</Text>
            </View>
          </View>
        </View>

        {/* Daily Breakdown */}
        {data.dailyBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Breakdown</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Date</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Orders</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Revenue</Text>
              </View>
              {data.dailyBreakdown.map((day, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{day.date}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{day.orders}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{formatCurrency(day.revenue)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Products */}
        {data.topProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Selling Products</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 0.5 }]}>Rank</Text>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Product</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Qty Sold</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Revenue</Text>
              </View>
              {data.topProducts.map((product, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 0.5 }]}>{idx + 1}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{product.name}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{product.quantity}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                    {formatCurrency(product.revenue)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Suarez Food Hub Admin Dashboard</Text>
          <Text style={styles.footerText}>{new Date().toLocaleDateString()}</Text>
        </View>
      </Page>
    </Document>
  );
}

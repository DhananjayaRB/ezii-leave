import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Layout from "@/components/Layout";
import { useWorkPattern } from "@/hooks/useWorkPattern";

export default function Holidays() {
  const [selectedMonth, setSelectedMonth] = useState("July 2025");

  const [viewMode, setViewMode] = useState("yearly"); // "monthly" or "yearly"

  // Month navigation functions
  const goToPreviousMonth = () => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const [monthName, year] = selectedMonth.split(" ");
    const currentIndex = monthNames.indexOf(monthName);

    if (currentIndex === 0) {
      setSelectedMonth(`December ${parseInt(year) - 1}`);
    } else {
      setSelectedMonth(`${monthNames[currentIndex - 1]} ${year}`);
    }
  };

  const goToNextMonth = () => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const [monthName, year] = selectedMonth.split(" ");
    const currentIndex = monthNames.indexOf(monthName);

    if (currentIndex === 11) {
      setSelectedMonth(`January ${parseInt(year) + 1}`);
    } else {
      setSelectedMonth(`${monthNames[currentIndex + 1]} ${year}`);
    }
  };

  const goToToday = () => {
    const today = new Date();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    setSelectedMonth(`${monthNames[today.getMonth()]} ${today.getFullYear()}`);
  };

  // Get work pattern data (includes user's assigned holidays)
  const {
    workPattern,
    holidays: workPatternHolidays,
    isLoading: workPatternLoading,
  } = useWorkPattern();

  // Fetch holidays from database as fallback when external API fails
  const { data: dbHolidays, isLoading: dbLoading } = useQuery({
    queryKey: ["/api/holidays"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all holidays from external API
  const {
    data: allHolidaysData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/external/holidays"],
    queryFn: async () => {
      const jwtToken = localStorage.getItem("jwt_token");
      console.log("🔑 [External Holidays] JWT token found:", !!jwtToken);
      console.log("🔑 [External Holidays] JWT token length:", jwtToken?.length);

      if (!jwtToken) {
        throw new Error("JWT token not found in localStorage");
      }

      console.log(
        "🌐 [External Holidays] Calling API: https://qa-api.resolveindia.com/organization/holidays",
      );
      const response = await fetch(
        "https://qa-api.resolveindia.com/organization/holidays",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log("🌐 [External Holidays] Response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.log("🌐 [External Holidays] Error response:", errorText);
        throw new Error(
          `Failed to fetch holidays: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      console.log("🌐 [External Holidays] Response data:", result);
      return result.data || result || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
  });

  // Use external holidays if available, fallback to database holidays
  const allHolidays =
    allHolidaysData && allHolidaysData.length > 0
      ? allHolidaysData
      : dbHolidays || [];

  // Filter holidays based on user's work pattern selectedHolidays
  const filteredHolidays =
    workPattern && workPattern.selectedHolidays
      ? allHolidays.filter((holiday: any) =>
          workPattern.selectedHolidays.includes(holiday.id),
        )
      : allHolidays; // Show all holidays if work pattern isn't available due to auth issues

  // Use external holidays if available, fallback to database holidays
  console.log(
    "🔄 Holiday Source: Using",
    allHolidaysData && allHolidaysData.length > 0 ? "External API" : "Database",
    "holidays",
  );
  console.log("🏢 [Holidays Debug] All holidays count:", allHolidays.length);
  console.log("🏢 [Holidays Debug] Raw holidays:", allHolidays);
  console.log(
    "🏢 [Holidays Debug] Work pattern selectedHolidays:",
    workPattern?.selectedHolidays,
  );
  console.log(
    "🏢 [Holidays Debug] Filtered holidays count:",
    filteredHolidays.length,
  );

  // Convert to the format expected by the calendar
  // Handle both external API format and database format
  const holidays = filteredHolidays.map((holiday: any) => {
    let date = "";
    let name = "";

    if (holiday.selectedDate) {
      // External API format
      date = holiday.selectedDate.split("T")[0];
      name = holiday.holidayName || "Holiday";
    } else if (holiday.date) {
      // Database format - date is already in YYYY-MM-DD format
      date = holiday.date.includes("T")
        ? holiday.date.split("T")[0]
        : holiday.date;
      name = holiday.name || "Holiday";
    }

    return { date, name };
  });

  console.log("🗓️ [Holidays Debug] Final processed holidays:", holidays);
  console.log("🗓️ [Holidays Debug] Selected month:", selectedMonth);

  // Generate calendar days for the selected month
  const generateCalendarDays = () => {
    const year = 2025;
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthName = selectedMonth.split(" ")[0];
    const month = monthNames.indexOf(monthName); // Get 0-indexed month

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      // Use local date formatting to avoid timezone issues
      const yearStr = currentDate.getFullYear();
      const monthStr = String(currentDate.getMonth() + 1).padStart(2, "0");
      const dayStr = String(currentDate.getDate()).padStart(2, "0");
      const dateString = `${yearStr}-${monthStr}-${dayStr}`;

      const holiday = holidays.find((h) => h.date === dateString);
      const isCurrentMonth = currentDate.getMonth() === month;

      // Debug August dates around Independence Day
      if (
        selectedMonth.includes("August") &&
        currentDate.getMonth() === 7 &&
        currentDate.getDate() >= 14 &&
        currentDate.getDate() <= 17
      ) {
        console.log(
          `🔍 August Debug: ${dateString} -> Day ${currentDate.getDate()}, Holiday: ${holiday?.name || "none"}`,
        );
      }

      days.push({
        date: currentDate.getDate(),
        fullDate: dateString,
        isCurrentMonth,
        holiday: holiday?.name,
        isHoliday: !!holiday,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  console.log("🗓️ Generated Calendar Days:", calendarDays);
  console.log("Calendar Days Length:", calendarDays.length);

  // Generate yearly calendar data for all 12 months
  const generateYearlyCalendar = () => {
    const year = 2025;
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return monthNames.map((monthName, monthIndex) => {
      const firstDay = new Date(year, monthIndex, 1);
      const lastDay = new Date(year, monthIndex + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());

      const days = [];
      const currentDate = new Date(startDate);

      for (let i = 0; i < 42; i++) {
        // Use local date formatting to avoid timezone issues
        const yearStr = currentDate.getFullYear();
        const monthStr = String(currentDate.getMonth() + 1).padStart(2, "0");
        const dayStr = String(currentDate.getDate()).padStart(2, "0");
        const dateString = `${yearStr}-${monthStr}-${dayStr}`;

        const holiday = holidays.find((h) => h.date === dateString);
        const isCurrentMonth = currentDate.getMonth() === monthIndex;

        days.push({
          date: currentDate.getDate(),
          fullDate: dateString,
          isCurrentMonth,
          holiday: holiday?.name,
          isHoliday: !!holiday,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        monthName,
        monthIndex,
        days,
      };
    });
  };

  const yearlyCalendar = generateYearlyCalendar();

  // Show loading state
  if (isLoading || workPatternLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading holidays...</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show error state
  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="text-red-500 mb-4">
                  <svg
                    className="w-12 h-12 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Failed to load holidays
                </h3>
                <p className="text-gray-600 mb-4">
                  {error instanceof Error
                    ? error.message
                    : "Unable to fetch holiday data from the server"}
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Holidays{" "}
              {filteredHolidays &&
                filteredHolidays.length > 0 &&
                `(${filteredHolidays.length} total)`}
            </h1>
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("monthly")}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    viewMode === "monthly"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setViewMode("yearly")}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    viewMode === "yearly"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  Yearly
                </button>
              </div>

              {/* Month Selector - only show in monthly view */}
              {viewMode === "monthly" && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="January 2025">January 2025</SelectItem>
                    <SelectItem value="February 2025">February 2025</SelectItem>
                    <SelectItem value="March 2025">March 2025</SelectItem>
                    <SelectItem value="April 2025">April 2025</SelectItem>
                    <SelectItem value="May 2025">May 2025</SelectItem>
                    <SelectItem value="June 2025">June 2025</SelectItem>
                    <SelectItem value="July 2025">July 2025</SelectItem>
                    <SelectItem value="August 2025">August 2025</SelectItem>
                    <SelectItem value="September 2025">
                      September 2025
                    </SelectItem>
                    <SelectItem value="October 2025">October 2025</SelectItem>
                    <SelectItem value="November 2025">November 2025</SelectItem>
                    <SelectItem value="December 2025">December 2025</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Yearly Summary - Show above yearly calendar */}
          {viewMode === "yearly" && (
            <div className="mb-6">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    All Holidays for 2025
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {holidays.map((holiday, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-2 bg-gray-50 rounded"
                      >
                        <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">
                          {new Date(holiday.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          - {holiday.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Monthly Holiday Legend - Show above monthly calendar */}
          {viewMode === "monthly" && (
            <div className="mb-6">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Holidays for {selectedMonth}
                  </h3>
                  <div className="space-y-2">
                    {(() => {
                      const monthNames = [
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                        "August",
                        "September",
                        "October",
                        "November",
                        "December",
                      ];
                      const monthName = selectedMonth.split(" ")[0];
                      const monthIndex = monthNames.indexOf(monthName);
                      const monthPrefix = `2025-${String(monthIndex + 1).padStart(2, "0")}`;

                      const monthHolidays = holidays.filter((holiday) =>
                        holiday.date.startsWith(monthPrefix),
                      );

                      if (monthHolidays.length === 0) {
                        return (
                          <div className="text-sm text-gray-500 italic">
                            No holidays in {selectedMonth}
                          </div>
                        );
                      }

                      return monthHolidays.map((holiday, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-3"
                        >
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">
                            {new Date(holiday.date).toLocaleDateString(
                              "en-US",
                              {
                                month: "long",
                                day: "numeric",
                              },
                            )}{" "}
                            - {holiday.name}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Calendar Views */}
          {viewMode === "monthly" ? (
            /* Monthly Calendar */
            <Card>
              <CardContent className="p-6">
                {/* Calendar Navigation Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedMonth}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span
                      className="px-3 py-2 text-sm bg-gray-600 text-white rounded cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={goToToday}
                    >
                      today
                    </span>
                    <span
                      className="px-3 py-2 text-sm border border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={goToPreviousMonth}
                    >
                      &#8249;
                    </span>
                    <span
                      className="px-3 py-2 text-sm border border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={goToNextMonth}
                    >
                      &#8250;
                    </span>
                  </div>
                </div>

                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="p-3 text-center text-sm font-medium text-gray-500"
                      >
                        {day}
                      </div>
                    ),
                  )}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => (
                    <div
                      key={index}
                      className={`min-h-[100px] p-2 border border-gray-200 ${
                        !day.isCurrentMonth
                          ? "bg-gray-50 text-gray-400"
                          : day.isHoliday
                            ? "bg-red-50 text-red-900"
                            : "bg-white text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`text-sm font-medium ${
                          day.isHoliday ? "text-red-600" : ""
                        }`}
                      >
                        {day.date}
                      </div>
                      {day.holiday && (
                        <div className="mt-1 text-xs text-red-600 font-medium">
                          {day.holiday}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Yearly Calendar */
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                  2025 Holiday Calendar
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {yearlyCalendar.map((month) => (
                    <div
                      key={month.monthName}
                      className="bg-white border rounded-lg p-4"
                    >
                      {/* Month Header */}
                      <h3 className="text-lg font-semibold text-gray-900 text-center mb-3">
                        {month.monthName}
                      </h3>

                      {/* Mini Calendar Header */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {["S", "M", "T", "W", "T", "F", "S"].map(
                          (day, index) => (
                            <div
                              key={index}
                              className="text-center text-xs font-medium text-gray-500 p-1"
                            >
                              {day}
                            </div>
                          ),
                        )}
                      </div>

                      {/* Mini Calendar Days */}
                      <div className="grid grid-cols-7 gap-1">
                        {month.days.map((day, dayIndex) => (
                          <div
                            key={dayIndex}
                            className={`h-8 flex items-center justify-center text-xs ${
                              !day.isCurrentMonth
                                ? "text-gray-300"
                                : day.isHoliday
                                  ? "bg-red-100 text-red-800 font-semibold rounded"
                                  : "text-gray-700 hover:bg-gray-50 rounded"
                            }`}
                            title={day.holiday || ""}
                          >
                            {day.date}
                          </div>
                        ))}
                      </div>

                      {/* Month Holiday List */}
                      <div className="mt-3 space-y-1">
                        {month.days
                          .filter((day) => day.isHoliday && day.isCurrentMonth)
                          .map((holidayDay, index) => (
                            <div key={index} className="text-xs">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                                <span className="text-gray-600 truncate">
                                  {holidayDay.date} - {holidayDay.holiday}
                                </span>
                              </div>
                            </div>
                          ))}
                        {month.days.filter(
                          (day) => day.isHoliday && day.isCurrentMonth,
                        ).length === 0 && (
                          <div className="text-xs text-gray-400 italic">
                            No holidays
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}

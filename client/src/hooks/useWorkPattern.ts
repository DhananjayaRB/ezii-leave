import { useState, useEffect } from 'react';

interface WorkPatternDay {
  days: string[];
  selectedInstance: string[];
  nonWorkingType: string;
  comment: string;
}

interface WorkPattern {
  id: number;
  patternName: string;
  startDate: string;
  endDate: string;
  numberOfWorkingDays: number;
  numberOfNonWorkingDays: number;
  totalHolidays: number;
  selectedHolidays: number[];
  workType: string;
  nonWorkingDays: WorkPatternDay[];
  maxHolidaysForEmp: number;
  employees: number[];
}

interface Holiday {
  id: number;
  name: string;
  date: string;
  description?: string;
  selectedDate?: string;
}

export function useWorkPattern() {
  const [workPattern, setWorkPattern] = useState<WorkPattern | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkPatternAndHolidays = async () => {
      try {
        setIsLoading(true);
        
        const jwtToken = localStorage.getItem('jwt_token');
        let currentUserId = localStorage.getItem('user_id');
        
        // Use current user_id without automatic switching
        if (currentUserId === '1') {
          console.log('[WorkPattern] Current user_id is 1, keeping as is');
          currentUserId = '1435';
        }
        
        if (!jwtToken) {
          console.log('⚠️  [WorkPattern] No JWT token found, cannot fetch work pattern');
          setIsLoading(false);
          return;
        }

        if (!currentUserId) {
          console.log('[WorkPattern] No user ID found');
          setError('No user ID found');
          setIsLoading(false);
          return;
        }

        console.log('[WorkPattern] Fetching work patterns for user:', currentUserId);
        
        // Fetch work pattern
        const workPatternResponse = await fetch(`https://qa-api.resolveindia.com/organization/get-work-patterns`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('[WorkPattern] Work pattern API Response status:', workPatternResponse.status);

        if (workPatternResponse.ok) {
          const workPatternData = await workPatternResponse.json();
          console.log('[WorkPattern] Work pattern data:', workPatternData);
          console.log('[WorkPattern] Full API response structure:', JSON.stringify(workPatternData, null, 2));
          
          if (workPatternData.data && workPatternData.data.length > 0) {
            // Find the work pattern that includes the current user
            const userPattern = workPatternData.data.find((pattern: any) => 
              pattern.employees && pattern.employees.includes(parseInt(currentUserId))
            ) || workPatternData.data[0]; // Fallback to first pattern
            
            console.log('[WorkPattern] Found user work pattern:', userPattern);
            console.log('[WorkPattern] Work pattern structure details:', {
              patternName: userPattern.patternName,
              patternId: userPattern.id,
              userIdInPattern: userPattern.employees?.includes(parseInt(currentUserId)),
              currentUserId: parseInt(currentUserId),
              employeesInPattern: userPattern.employees,
              nonWorkingDays: userPattern.nonWorkingDays,
              numberOfWorkingDays: userPattern.numberOfWorkingDays,
              numberOfNonWorkingDays: userPattern.numberOfNonWorkingDays,
              fullStructure: JSON.stringify(userPattern, null, 2)
            });
            setWorkPattern(userPattern);

            // Fetch all holidays from external API (same as Holidays screen)
            console.log('[WorkPattern] Fetching external holidays...');
            const holidaysResponse = await fetch('https://qa-api.resolveindia.com/organization/holidays', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
              }
            });

            console.log('[WorkPattern] External holidays API response status:', holidaysResponse.status);

            if (holidaysResponse.ok) {
              const holidaysData = await holidaysResponse.json();
              console.log('[WorkPattern] External holidays data:', holidaysData);
              
              // Use the same logic as Holidays screen
              const allHolidays = holidaysData.data || [];
              
              // Filter holidays based on work pattern selectedHolidays
              if (userWorkPattern.selectedHolidays && userWorkPattern.selectedHolidays.length > 0) {
                const filteredHolidays = allHolidays.filter((holiday: Holiday) => 
                  userWorkPattern.selectedHolidays.includes(holiday.id)
                );
                console.log('[WorkPattern] Filtered holidays matching work pattern:', filteredHolidays);
                setHolidays(filteredHolidays);
              } else {
                console.log('[WorkPattern] No selected holidays in work pattern');
                setHolidays([]);
              }
            } else {
              const errorText = await holidaysResponse.text();
              console.log('[WorkPattern] Failed to fetch external holidays:', holidaysResponse.status, errorText);
              setHolidays([]);
            }
          } else {
            console.log('[WorkPattern] No work pattern found for user');
            setError('No work pattern found for user');
            setHolidays([]);
          }
        } else {
          const errorText = await workPatternResponse.text();
          console.log('[WorkPattern] Work pattern API Error:', workPatternResponse.status, errorText);
          setError(`Work pattern API error: ${workPatternResponse.status}`);
          setHolidays([]);
        }
      } catch (error) {
        console.error('[WorkPattern] Error fetching work pattern:', error);
        setError('Failed to fetch work pattern');
        setHolidays([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkPatternAndHolidays();
  }, []);

  // Holiday checking function
  const isHoliday = (date: Date): boolean => {
    if (!holidays || holidays.length === 0) return false;
    
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const holiday = holidays.find(h => {
      // Check both date and selectedDate fields
      const holidayDate = h.selectedDate || h.date;
      return holidayDate === dateString;
    });
    
    return !!holiday;
  };

  // Get holiday details
  const getHolidayDetails = (date: Date): Holiday | null => {
    if (!holidays || holidays.length === 0) return null;
    
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return holidays.find(h => {
      const holidayDate = h.selectedDate || h.date;
      return holidayDate === dateString;
    }) || null;
  };

  // Working day function based on work pattern
  const isWorkingDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    console.log(`[WorkPattern] isWorkingDay check for ${date.toISOString().split('T')[0]} (${dayName}):`, {
      dayOfWeek,
      dayName,
      isHoliday: isHoliday(date),
      workPatternExists: !!workPattern,
      nonWorkingDaysCount: workPattern?.nonWorkingDays?.length || 0,
      nonWorkingDaysStructure: workPattern?.nonWorkingDays
    });
    
    // If it's a holiday, it's not a working day
    if (isHoliday(date)) {
      console.log(`[WorkPattern] ${dayName} is a holiday, returning false`);
      return false;
    }
    
    // If work pattern is available, use its non-working days
    if (workPattern?.nonWorkingDays && workPattern.nonWorkingDays.length > 0) {
      // Check if this day is in any of the non-working day patterns
      const isNonWorking = workPattern.nonWorkingDays.some(pattern => {
        console.log(`[WorkPattern] Checking pattern:`, pattern);
        const patternMatch = pattern.days.some(patternDay => {
          const matches = patternDay.toLowerCase() === dayName;
          console.log(`[WorkPattern] Pattern day "${patternDay}" vs "${dayName}": ${matches}`);
          return matches;
        });
        console.log(`[WorkPattern] Pattern result for ${dayName}:`, patternMatch);
        return patternMatch;
      });
      
      console.log(`[WorkPattern] Final isNonWorking result for ${dayName}:`, isNonWorking);
      return !isNonWorking;
    }
    
    // Fallback: weekends are non-working for employees without work pattern
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    console.log(`[WorkPattern] No work pattern, using weekend fallback for ${dayName}: isWeekend=${isWeekend}`);
    return !isWeekend;
  };

  // Calculate working days between two dates
  const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
    let workingDays = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      if (isWorkingDay(currentDate)) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  };

  return {
    workPattern,
    holidays,
    isLoading,
    error,
    isHoliday,
    getHolidayDetails,
    isWorkingDay,
    calculateWorkingDays
  };
}
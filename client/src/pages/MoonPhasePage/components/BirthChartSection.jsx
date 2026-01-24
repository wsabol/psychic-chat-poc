import BirthChartCard from '../../../components/BirthChartCard';

/**
 * BirthChartSection Component
 * Displays the user's birth chart (Rising, Moon, Sun signs)
 */
export function BirthChartSection({ astroData }) {
  if (!astroData?.sun_sign) return null;

  return (
    <section className="moon-phase-birth-chart">
      <div className="birth-chart-cards">
        {astroData.rising_sign && (
          <BirthChartCard 
            sign={astroData.rising_sign} 
            degree={astroData.rising_degree} 
            icon="↗️" 
            type="rising" 
          />
        )}
        {astroData.moon_sign && (
          <BirthChartCard 
            sign={astroData.moon_sign} 
            degree={astroData.moon_degree} 
            icon="🌙" 
            type="moon" 
          />
        )}
        {astroData.sun_sign && (
          <BirthChartCard 
            sign={astroData.sun_sign} 
            degree={astroData.sun_degree} 
            icon="☀️" 
            type="sun" 
          />
        )}
      </div>
    </section>
  );
}

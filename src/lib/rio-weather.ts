export type RioWeather = {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  precipitation: number;
  isDay: boolean;
  label: string;
};

const RIO_WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=-22.9068&longitude=-43.1729&current=temperature_2m,apparent_temperature,weather_code,is_day,precipitation&temperature_unit=celsius&precipitation_unit=mm&timezone=America%2FSao_Paulo";

export function weatherLabel(code: number) {
  if (code === 0) return "clear";
  if (code === 1) return "mostly clear";
  if (code === 2) return "partly cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "outside";
}

export async function getRioWeather(signal?: AbortSignal): Promise<RioWeather> {
  const response = await fetch(RIO_WEATHER_URL, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Rio weather request failed (${response.status})`);
  }

  const body = await response.json();
  const current = body?.current;

  if (
    typeof current?.temperature_2m !== "number" ||
    typeof current?.apparent_temperature !== "number" ||
    typeof current?.weather_code !== "number"
  ) {
    throw new Error("Rio weather response was incomplete.");
  }

  return {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    weatherCode: current.weather_code,
    precipitation: typeof current.precipitation === "number" ? current.precipitation : 0,
    isDay: current.is_day === 1,
    label: weatherLabel(current.weather_code),
  };
}

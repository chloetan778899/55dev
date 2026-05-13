<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import createGlobe from 'cobe';

const props = defineProps({
  completedTasks: { type: Number, default: 0 },
  maxTasks: { type: Number, default: 40 },
  isMuted: { type: Boolean, default: false },
  taskStatus: { type: String, default: 'Idle' }
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const activeCityName = ref<string>();
const showTooltip = ref(false);

const isDarkMode = ref(true);
let themeObserver: MutationObserver | null = null;
let visibilityObserver: IntersectionObserver | null = null;

let isVisible = true;
let isTabVisible = true; 
let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

let globe: any = null;
let currentPhi = 0;
let currentTheta = 0;
let targetPhi = 0;
let targetTheta = 0;
let currentDark = 1;
let targetDarkNum = 1;
let needsUpdate = true;

let cachedIsMuted = props.isMuted; 

const cycleCount = ref(0);
const markers = ref<any[]>([]);

const usCenterLat = 39.8283;
const usCenterLng = -98.5795;
let previousLocation: number[] | null = null; 

const cachedGlobeData = {
  markers: [] as any[]
};

const globalCities = [
  { name: "New York, US", lat: 40.7128, lng: -74.0060 }, { name: "Los Angeles, US", lat: 34.0522, lng: -118.2437 },
  { name: "Chicago, US", lat: 41.8781, lng: -87.6298 }, { name: "Houston, US", lat: 29.7604, lng: -95.3698 },
  { name: "Phoenix, US", lat: 33.4484, lng: -112.0740 }, { name: "Philadelphia, US", lat: 39.9526, lng: -75.1652 },
  { name: "San Diego, US", lat: 32.7157, lng: -117.1611 }, { name: "Dallas, US", lat: 32.7767, lng: -96.7970 },
  { name: "San Jose, US", lat: 37.3382, lng: -121.8863 }, { name: "Austin, US", lat: 30.2672, lng: -97.7431 },
  { name: "San Francisco, US", lat: 37.7749, lng: -122.4194 }, { name: "Seattle, US", lat: 47.6062, lng: -122.3321 },
  { name: "Denver, US", lat: 39.7392, lng: -104.9903 }, { name: "Washington, US", lat: 38.9072, lng: -77.0369 },
  { name: "Boston, US", lat: 42.3601, lng: -71.0589 }, { name: "Miami, US", lat: 25.7617, lng: -80.1918 },
  { name: "Las Vegas, US", lat: 36.1699, lng: -115.1398 }, { name: "Orlando, US", lat: 28.5383, lng: -81.3792 },
  { name: "Atlanta, US", lat: 33.7490, lng: -84.3880 }, { name: "Portland, US", lat: 45.5152, lng: -122.6784 },
  { name: "Detroit, US", lat: 42.3314, lng: -83.0458 }, { name: "Minneapolis, US", lat: 44.9778, lng: -93.2650 },
  { name: "Tampa, US", lat: 27.9506, lng: -82.4572 }, { name: "Salt Lake City, US", lat: 40.7608, lng: -111.8910 },
  { name: "Sacramento, US", lat: 38.5816, lng: -121.4944 }, { name: "Cincinnati, US", lat: 39.1031, lng: -84.5120 },
  { name: "Toronto, CA", lat: 43.6510, lng: -79.3470 }, { name: "Montreal, CA", lat: 45.5017, lng: -73.5673 },
  { name: "Vancouver, CA", lat: 49.2827, lng: -123.1207 }, { name: "Calgary, CA", lat: 51.0447, lng: -114.0719 },
  { name: "Ottawa, CA", lat: 45.4215, lng: -75.6972 }, { name: "Winnipeg, CA", lat: 49.8951, lng: -97.1384 },
  { name: "Halifax, CA", lat: 44.6488, lng: -63.5752 }, { name: "Victoria, CA", lat: 48.4284, lng: -123.3656 },
  { name: "Mexico City, MX", lat: 19.4326, lng: -99.1332 }, { name: "Guadalajara, MX", lat: 20.6597, lng: -103.3496 }, 
  { name: "Monterrey, MX", lat: 25.6866, lng: -100.3161 }, { name: "Tijuana, MX", lat: 32.5149, lng: -117.0382 },
  { name: "Puebla, MX", lat: 19.0414, lng: -98.2063 }, { name: "Cancún, MX", lat: 21.1619, lng: -86.8515 },
  { name: "São Paulo, BR", lat: -23.5505, lng: -46.6333 }, { name: "Buenos Aires, AR", lat: -34.6037, lng: -58.3816 },
  { name: "Rio de Janeiro, BR", lat: -22.9068, lng: -43.1729 }, { name: "Bogotá, CO", lat: 4.7110, lng: -74.0721 },
  { name: "Lima, PE", lat: -12.0464, lng: -77.0428 }, { name: "Santiago, CL", lat: -33.4489, lng: -70.6693 },
  { name: "Belo Horizonte, BR", lat: -19.9167, lng: -43.9345 }, { name: "Medellín, CO", lat: 6.2442, lng: -75.5812 },
  { name: "Brasília, BR", lat: -15.7975, lng: -47.8919 }, { name: "Salvador, BR", lat: -12.9714, lng: -38.5111 },
  { name: "Fortaleza, BR", lat: -3.7319, lng: -38.5267 }, { name: "Curitiba, BR", lat: -25.4284, lng: -49.2733 },
  { name: "Córdoba, AR", lat: -31.4201, lng: -64.1888 }, { name: "Rosario, AR", lat: -32.9468, lng: -60.6393 },
  { name: "Cali, CO", lat: 3.4516, lng: -76.5320 }, { name: "Cartagena, CO", lat: 10.3910, lng: -75.4794 },
  { name: "Arequipa, PE", lat: -16.4090, lng: -71.5375 }, { name: "Valparaíso, CL", lat: -33.0472, lng: -71.6127 },
  { name: "Montevideo, UY", lat: -34.9011, lng: -56.1645 }, { name: "Asunción, PY", lat: -25.2637, lng: -57.5759 },
  { name: "London, UK", lat: 51.5074, lng: -0.1278 }, { name: "Manchester, UK", lat: 53.4808, lng: -2.2426 },
  { name: "Birmingham, UK", lat: 52.4862, lng: -1.8904 }, { name: "Edinburgh, UK", lat: 55.9533, lng: -3.1883 },
  { name: "Glasgow, UK", lat: 55.8642, lng: -4.2518 }, { name: "Liverpool, UK", lat: 53.4084, lng: -2.9916 },
  { name: "Bristol, UK", lat: 51.4545, lng: -2.5879 }, { name: "Belfast, UK", lat: 54.5973, lng: -5.9301 },
  { name: "Paris, FR", lat: 48.8566, lng: 2.3522 }, { name: "Lyon, FR", lat: 45.7640, lng: 4.8357 },
  { name: "Marseille, FR", lat: 43.2965, lng: 5.3698 }, { name: "Toulouse, FR", lat: 43.6047, lng: 1.4442 },
  { name: "Nice, FR", lat: 43.7102, lng: 7.2620 }, { name: "Strasbourg, FR", lat: 48.5734, lng: 7.7521 },
  { name: "Berlin, DE", lat: 52.5200, lng: 13.4050 }, { name: "Hamburg, DE", lat: 53.5511, lng: 9.9937 }, 
  { name: "Munich, DE", lat: 48.1351, lng: 11.5820 }, { name: "Frankfurt, DE", lat: 50.1109, lng: 8.6821 },
  { name: "Stuttgart, DE", lat: 48.7758, lng: 9.1829 }, { name: "Cologne, DE", lat: 50.9375, lng: 6.9603 },
  { name: "Leipzig, DE", lat: 51.3397, lng: 12.3731 }, { name: "Madrid, ES", lat: 40.4168, lng: -3.7038 },
  { name: "Barcelona, ES", lat: 41.3851, lng: 2.1734 }, { name: "Valencia, ES", lat: 39.4699, lng: -0.3763 },
  { name: "Seville, ES", lat: 37.3891, lng: -5.9845 }, { name: "Zaragoza, ES", lat: 41.6488, lng: -0.8891 },
  { name: "Rome, IT", lat: 41.9028, lng: 12.4964 }, { name: "Milan, IT", lat: 45.4642, lng: 9.1900 },
  { name: "Naples, IT", lat: 40.8518, lng: 14.2681 }, { name: "Turin, IT", lat: 45.0703, lng: 7.6869 },
  { name: "Florence, IT", lat: 43.7696, lng: 11.2558 }, { name: "Venice, IT", lat: 45.4408, lng: 12.3155 },
  { name: "Amsterdam, NL", lat: 52.3676, lng: 4.9041 }, { name: "Rotterdam, NL", lat: 51.9225, lng: 4.4792 },
  { name: "The Hague, NL", lat: 52.0705, lng: 4.3007 }, { name: "Brussels, BE", lat: 50.8503, lng: 4.3517 }, 
  { name: "Antwerp, BE", lat: 51.2194, lng: 4.4025 }, { name: "Zurich, CH", lat: 47.3769, lng: 8.5417 }, 
  { name: "Geneva, CH", lat: 46.2044, lng: 6.1432 }, { name: "Bern, CH", lat: 46.9480, lng: 7.4474 },
  { name: "Vienna, AT", lat: 48.2082, lng: 16.3738 }, { name: "Stockholm, SE", lat: 59.3293, lng: 18.0686 },
  { name: "Gothenburg, SE", lat: 57.7089, lng: 11.9746 }, { name: "Malmö, SE", lat: 55.6050, lng: 13.0038 },
  { name: "Oslo, NO", lat: 59.9139, lng: 10.7522 }, { name: "Bergen, NO", lat: 60.3913, lng: 5.3221 },
  { name: "Copenhagen, DK", lat: 55.6761, lng: 12.5683 }, { name: "Aarhus, DK", lat: 56.1629, lng: 10.2039 },
  { name: "Helsinki, FI", lat: 60.1695, lng: 24.9354 }, { name: "Tampere, FI", lat: 61.4978, lng: 23.7610 },
  { name: "Dublin, IE", lat: 53.3498, lng: -6.2603 }, { name: "Lisbon, PT", lat: 38.7223, lng: -9.1393 },
  { name: "Porto, PT", lat: 41.1579, lng: -8.6291 }, { name: "Warsaw, PL", lat: 52.2297, lng: 21.0122 },
  { name: "Krakow, PL", lat: 50.0614, lng: 19.9366 }, { name: "Wrocław, PL", lat: 51.1079, lng: 17.0385 },
  { name: "Gdańsk, PL", lat: 54.3520, lng: 18.6466 }, { name: "Prague, CZ", lat: 50.0755, lng: 14.4378 },
  { name: "Budapest, HU", lat: 47.4979, lng: 19.0402 }, { name: "Bucharest, RO", lat: 44.4268, lng: 26.1025 },
  { name: "Cluj-Napoca, RO", lat: 46.7712, lng: 23.6236 }, { name: "Athens, GR", lat: 37.9838, lng: 23.7275 }, 
  { name: "Sofia, BG", lat: 42.6977, lng: 23.3219 }, { name: "Riga, LV", lat: 56.9496, lng: 24.1053 },
  { name: "Tallinn, EE", lat: 59.4370, lng: 24.7536 }, { name: "Vilnius, LT", lat: 54.6872, lng: 25.2797 },
  { name: "Tokyo, JP", lat: 35.6895, lng: 139.6917 }, { name: "Osaka, JP", lat: 34.6937, lng: 135.5023 },
  { name: "Kyoto, JP", lat: 35.0116, lng: 135.7681 }, { name: "Yokohama, JP", lat: 35.4437, lng: 139.6380 },
  { name: "Nagoya, JP", lat: 35.1815, lng: 136.9066 }, { name: "Fukuoka, JP", lat: 33.5902, lng: 130.4017 },
  { name: "Sapporo, JP", lat: 43.0618, lng: 141.3545 }, { name: "Kobe, JP", lat: 34.6901, lng: 135.1955 },
  { name: "Hiroshima, JP", lat: 34.3853, lng: 132.4553 }, { name: "Sendai, JP", lat: 38.2682, lng: 140.8694 },
  { name: "Seoul, KR", lat: 37.5665, lng: 126.9780 }, { name: "Busan, KR", lat: 35.1796, lng: 129.0756 },
  { name: "Incheon, KR", lat: 37.4563, lng: 126.7052 }, { name: "Daegu, KR", lat: 35.8714, lng: 128.6014 },
  { name: "Daejeon, KR", lat: 36.3504, lng: 127.3845 }, { name: "Ulsan, KR", lat: 35.5384, lng: 129.3114 },
  { name: "Delhi, IN", lat: 28.6139, lng: 77.2090 }, { name: "Mumbai, IN", lat: 19.0760, lng: 72.8777 }, 
  { name: "Bangalore, IN", lat: 12.9716, lng: 77.5946 }, { name: "Kolkata, IN", lat: 22.5726, lng: 88.3639 }, 
  { name: "Chennai, IN", lat: 13.0827, lng: 80.2707 }, { name: "Hyderabad, IN", lat: 17.3850, lng: 78.4867 }, 
  { name: "Pune, IN", lat: 18.5204, lng: 73.8567 }, { name: "Ahmedabad, IN", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur, IN", lat: 26.9124, lng: 75.7873 }, { name: "Surat, IN", lat: 21.1702, lng: 72.8311 },
  { name: "Lucknow, IN", lat: 26.8467, lng: 80.9462 }, { name: "Kanpur, IN", lat: 26.4499, lng: 80.3319 },
  { name: "Jakarta, ID", lat: -6.2088, lng: 106.8456 }, { name: "Surabaya, ID", lat: -7.2504, lng: 112.7688 },
  { name: "Bandung, ID", lat: -6.9175, lng: 107.6191 }, { name: "Medan, ID", lat: 3.5952, lng: 98.6722 },
  { name: "Manila, PH", lat: 14.5995, lng: 120.9842 }, { name: "Cebu City, PH", lat: 10.3157, lng: 123.8854 }, 
  { name: "Davao City, PH", lat: 7.1907, lng: 125.4553 }, { name: "Bangkok, TH", lat: 13.7563, lng: 100.5018 },
  { name: "Chiang Mai, TH", lat: 18.7883, lng: 98.9853 }, { name: "Phuket, TH", lat: 7.8804, lng: 98.3923 },
  { name: "Ho Chi Minh, VN", lat: 10.8231, lng: 106.6297 }, { name: "Hanoi, VN", lat: 21.0285, lng: 105.8542 }, 
  { name: "Da Nang, VN", lat: 16.0544, lng: 108.2022 }, { name: "Hai Phong, VN", lat: 20.8449, lng: 106.6881 },
  { name: "Kuala Lumpur, MY", lat: 3.1390, lng: 101.6869 }, { name: "George Town, MY", lat: 5.4141, lng: 100.3288 },
  { name: "Johor Bahru, MY", lat: 1.4927, lng: 103.7414 }, { name: "Singapore, SG", lat: 1.3521, lng: 103.8198 },
  { name: "Sydney, AU", lat: -33.8688, lng: 151.2093 }, { name: "Melbourne, AU", lat: -37.8136, lng: 144.9631 },
  { name: "Brisbane, AU", lat: -27.4698, lng: 153.0251 }, { name: "Perth, AU", lat: -31.9505, lng: 115.8605 },
  { name: "Adelaide, AU", lat: -34.9285, lng: 138.6007 }, { name: "Gold Coast, AU", lat: -28.0167, lng: 153.4000 },
  { name: "Hobart, AU", lat: -42.8821, lng: 147.3272 }, { name: "Darwin, AU", lat: -12.4634, lng: 130.8456 },
  { name: "Canberra, AU", lat: -35.2809, lng: 149.1300 }, { name: "Auckland, NZ", lat: -36.8485, lng: 174.7633 }, 
  { name: "Wellington, NZ", lat: -41.2865, lng: 174.7762 }, { name: "Christchurch, NZ", lat: -43.5320, lng: 172.6306 },
  { name: "Hamilton, NZ", lat: -37.7870, lng: 175.2793 }, { name: "Dunedin, NZ", lat: -45.8788, lng: 170.5028 },
  { name: "San Antonio, US", lat: 29.4241, lng: -98.4936 }, { name: "Columbus, US", lat: 39.9612, lng: -83.0007 },
  { name: "Indianapolis, US", lat: 39.7684, lng: -86.1581 }, { name: "Charlotte, US", lat: 35.2271, lng: -80.8431 },
  { name: "Baltimore, US", lat: 39.2904, lng: -76.6122 }, { name: "Nashville, US", lat: 36.1627, lng: -86.7816 },
  { name: "New Orleans, US", lat: 29.9511, lng: -90.0715 }, { name: "St. Louis, US", lat: 38.6270, lng: -90.1994 },
  { name: "Kansas City, US", lat: 39.0997, lng: -94.5786 }, { name: "Cleveland, US", lat: 41.4993, lng: -81.6944 },
  { name: "Pittsburgh, US", lat: 40.4406, lng: -79.9959 }, { name: "Raleigh, US", lat: 35.7796, lng: -78.6382 },
  { name: "Leeds, UK", lat: 53.8008, lng: -1.5491 }, { name: "Sheffield, UK", lat: 53.3811, lng: -1.4701 },
  { name: "Bordeaux, FR", lat: 44.8378, lng: -0.5792 }, { name: "Lille, FR", lat: 50.6292, lng: 3.0573 },
  { name: "Düsseldorf, DE", lat: 51.2277, lng: 6.7735 }, { name: "Bremen, DE", lat: 53.0793, lng: 8.8017 },
  { name: "Bilbao, ES", lat: 43.2630, lng: -2.9350 }, { name: "Málaga, ES", lat: 36.7213, lng: -4.4214 },
  { name: "Bologna, IT", lat: 44.4949, lng: 11.3426 }, { name: "Palermo, IT", lat: 38.1157, lng: 13.3613 },
  { name: "Utrecht, NL", lat: 52.0907, lng: 5.1214 }, { name: "Basel, CH", lat: 47.5596, lng: 7.5886 },
  { name: "Reykjavik, IS", lat: 64.1466, lng: -21.9426 }, { name: "Luxembourg City, LU", lat: 49.6116, lng: 6.1319 },
  { name: "Bratislava, SK", lat: 48.1486, lng: 17.1077 }, { name: "Zagreb, HR", lat: 45.8150, lng: 15.9819 },
  { name: "Belgrade, RS", lat: 44.8125, lng: 20.4612 }, { name: "Ljubljana, SI", lat: 46.0569, lng: 14.5058 },
  { name: "Edmonton, CA", lat: 53.5461, lng: -113.4938 }, { name: "Quebec City, CA", lat: 46.8139, lng: -71.2080 },
  { name: "Saskatoon, CA", lat: 52.1332, lng: -106.6700 }, { name: "Regina, CA", lat: 50.4452, lng: -104.6189 },
  { name: "St. John's, CA", lat: 47.5615, lng: -52.7126 },
  { name: "Kawasaki, JP", lat: 35.5298, lng: 139.7042 }, { name: "Saitama, JP", lat: 35.8617, lng: 139.6455 },
  { name: "Chiba, JP", lat: 35.6073, lng: 140.1063 }, { name: "Kitakyushu, JP", lat: 33.8833, lng: 130.8833 },
  { name: "Kumamoto, JP", lat: 32.8032, lng: 130.7079 },
  { name: "Gwangju, KR", lat: 35.1595, lng: 126.8526 }, { name: "Suwon, KR", lat: 37.2636, lng: 127.0286 },
  { name: "Changwon, KR", lat: 35.2280, lng: 128.6811 }, { name: "Seongnam, KR", lat: 37.4449, lng: 127.1389 },
  { name: "Jeju City, KR", lat: 33.4996, lng: 126.5312 },
  { name: "Hong Kong, HK", lat: 22.3193, lng: 114.1694 }, 
  { name: "Macau, MO", lat: 22.1987, lng: 113.5439 },
  { name: "Cần Thơ, VN", lat: 10.0452, lng: 105.7469 }, 
  { name: "Huế, VN", lat: 16.4637, lng: 107.5909 },
  { name: "Nha Trang, VN", lat: 12.2388, lng: 109.1967 },
  { name: "Valletta, MT", lat: 35.8992, lng: 14.5141 }, { name: "Monaco, MC", lat: 43.7384, lng: 7.4246 }
];

const handleVisibilityChange = () => {
  isTabVisible = !document.hidden;
  if (!isTabVisible) {
    targetPhi = currentPhi;
    targetTheta = currentTheta;
  }
};

const setCameraToLocation = (lat: number, lng: number) => {
  const targetPhiNew = (Math.PI * 1.5) - ((lng * Math.PI) / 180);
  const targetThetaNew = (lat * Math.PI) / 180;

  let deltaPhi = (targetPhiNew - currentPhi) % (Math.PI * 2);
  if (deltaPhi > Math.PI) deltaPhi -= Math.PI * 2;
  if (deltaPhi < -Math.PI) deltaPhi += Math.PI * 2;
  
  targetPhi = currentPhi + deltaPhi;
  targetTheta = targetThetaNew;
};

const updateCachedData = () => {
  cachedGlobeData.markers = markers.value.map(m => ({ 
    location: [...m.location], 
    size: m.size 
  }));
  needsUpdate = true;
};

const triggerAnimation = (newCount: number, oldCount: number) => {
  if (newCount < oldCount) {
    cycleCount.value++;
    markers.value = [];
    showTooltip.value = false;
    previousLocation = null;
    updateCachedData();
    setCameraToLocation(usCenterLat, usCenterLng);
    return;
  }

  if (newCount === 0) return;

  let lastCity: any = null;
  for (let i = Math.max(1, oldCount + 1); i <= newCount; i++) {
    const seededIndex = (i * 137) % globalCities.length;
    const currentCity = globalCities[seededIndex];
    const destination = [currentCity.lat, currentCity.lng];

    markers.value.push({ location: [...destination], size: 0.05 });
    if (markers.value.length > 5) markers.value.shift();

    lastCity = currentCity;
  }

  if (lastCity) {
    previousLocation = [lastCity.lat, lastCity.lng];
    updateCachedData();
    setCameraToLocation(lastCity.lat, lastCity.lng);

    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    showTooltip.value = false;
    
    tooltipTimeout = setTimeout(async () => {
      activeCityName.value = lastCity.name;
      await nextTick();
      showTooltip.value = true;
    }, 1200); 
  }
};

const initGlobe = () => {
  if (globe) globe.destroy();
  if (!canvasRef.value) return;

  const clientWidth = canvasRef.value.clientWidth || 400;
  const renderSize = Math.min(clientWidth, 400);
  const dpr = 1;

  const themeMarkerColor: [number, number, number] = [0, 0.44, 0.95];
  const themeGlowColor: [number, number, number] = [0.9, 0.9, 0.9];

  globe = createGlobe(canvasRef.value, {
    devicePixelRatio: dpr,
    width: renderSize,
    height: renderSize,
    phi: currentPhi,
    theta: currentTheta,
    dark: currentDark,
    diffuse: 1.2,
    mapSamples: 4000,
    mapBrightness: 5,
    baseColor: [0.95, 0.95, 0.95], 
    markerColor: themeMarkerColor,
    glowColor: themeGlowColor,
    markers: cachedGlobeData.markers,
    markerElevation: 0.02,
    arcs: [],

onRender: (state: Record<string, any>) => {
  if (!isVisible || !isTabVisible) return;

  const diffPhi = targetPhi - currentPhi;
  const diffTheta = targetTheta - currentTheta;
  const diffDark = targetDarkNum - currentDark;

  const isMoving = Math.abs(diffPhi) > 0.005 || 
                   Math.abs(diffTheta) > 0.005 || 
                   Math.abs(diffDark) > 0.005 || 
                   needsUpdate || 
                   cachedIsMuted;

  if (!isMoving) return;

  currentPhi += diffPhi * 0.05;
  currentTheta += diffTheta * 0.05;

  if (cachedIsMuted) {
    currentPhi += 0.0005;
    targetPhi = currentPhi;
  }
      
  currentDark += diffDark * 0.05;

  state.phi = currentPhi;
  state.theta = currentTheta;
  state.dark = currentDark;

  if (needsUpdate) {
    state.markers = cachedGlobeData.markers;
    needsUpdate = false;
  }
}
  } as any);
};

watch(() => props.isMuted, (newVal) => {
  cachedIsMuted = newVal;
});

watch(() => props.completedTasks, (newVal, oldVal) => {
  triggerAnimation(newVal, oldVal);
});

onMounted(() => {
  if (!canvasRef.value) return;

  document.addEventListener('visibilitychange', handleVisibilityChange);

  isDarkMode.value = document.documentElement.classList.contains('dark');
  currentDark = isDarkMode.value ? 1 : 0;
  targetDarkNum = currentDark;

  themeObserver = new MutationObserver(() => {
    isDarkMode.value = document.documentElement.classList.contains('dark');
    targetDarkNum = isDarkMode.value ? 1 : 0;
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  initGlobe();
  setCameraToLocation(usCenterLat, usCenterLng);
  if (props.completedTasks > 0) triggerAnimation(props.completedTasks, 0);

  visibilityObserver = new IntersectionObserver((entries) => {
    isVisible = entries[0].isIntersecting;
    if (isVisible) {
      targetPhi = currentPhi;
      targetTheta = currentTheta;
    }
  });

  if (canvasRef.value) {
    visibilityObserver.observe(canvasRef.value);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  
  if (globe) {
    globe.destroy();
    globe = null; 
  }

  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
  if (visibilityObserver) {
    visibilityObserver.disconnect();
    visibilityObserver = null;
  }

  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }

  canvasRef.value = null;
});
</script>

<template>
  <div class="relative w-full max-w-102.5 h-102.5 mx-auto flex items-center justify-center overflow-visible">    
    <canvas 
      ref="canvasRef" 
      class="w-full h-full object-contain transition-opacity duration-700 ease-in-out pointer-events-none"
      :class="isMuted ? 'opacity-50' : 'opacity-100'"
      style="pointer-events: none;"
    ></canvas>

    <Transition name="pop">
      <div v-if="showTooltip && !isMuted && activeCityName" 
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+45px)] bg-black/80 text-white backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl shadow-[0_0_20px_rgba(0,112,243,0.3)] z-10 flex flex-col items-center justify-center min-w-27.5">
        
        <div class="flex items-center gap-1.5 mb-1 bg-white/10 px-2 py-0.5 rounded-full">
          <span class="relative flex h-1.5 w-1.5">
            <span class="relative inline-flex rounded-full h-1.5 w-1.5" :class="taskStatus === 'Success' ? 'bg-emerald-400' : (taskStatus === 'Pending' ? 'bg-yellow-400' : (taskStatus === 'Syncing' ? 'bg-[#0070f3]' : 'bg-gray-400'))"></span>
          </span>
          <span class="text-[9px] uppercase font-bold text-gray-200 tracking-wider whitespace-nowrap">
            {{ 
              taskStatus === 'Success' ? 'Cloud Synced' : 
              taskStatus === 'Pending' ? 'Pending Sync' : 
              taskStatus === 'Syncing' ? 'Connecting...' : 
              'System Idle' 
            }}
          </span>
        </div>

        <div class="flex items-center font-sans text-[11px] font-semibold tracking-wider whitespace-nowrap">
          <span class="material-icons-round text-[10px] text-[#0070f3] mr-1">location_on</span>
          {{ activeCityName }}
        </div>
        
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.pop-enter-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.pop-leave-active {
  transition: all 0.2s ease-in;
}
.pop-enter-from, .pop-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-50% - 15px)) scale(0.8);
}
</style>
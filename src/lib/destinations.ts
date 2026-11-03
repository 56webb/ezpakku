/** 地圖上可點的國家與地點。經緯度是圓點位置。 */

export type DestinationPlace = {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
};

export type DestinationCountry = {
  id: string;
  name: string;
  places: DestinationPlace[];
};

export const destinations: DestinationCountry[] = [
  {
    id: "jp",
    name: "日本",
    places: [
      { id: "tokyo", name: "東京", longitude: 139.6917, latitude: 35.6895 },
      { id: "osaka", name: "大阪", longitude: 135.5022, latitude: 34.6937 },
      { id: "kyoto", name: "京都", longitude: 135.7681, latitude: 35.0116 },
      { id: "fukuoka", name: "福岡", longitude: 130.4017, latitude: 33.5902 },
      { id: "okinawa", name: "沖繩", longitude: 127.6809, latitude: 26.2124 },
      { id: "hokkaido", name: "北海道", longitude: 141.3469, latitude: 43.0642 },
      { id: "nagoya", name: "名古屋", longitude: 136.9066, latitude: 35.1815 },
      { id: "nara", name: "奈良", longitude: 135.8048, latitude: 34.6851 },
      { id: "hiroshima", name: "廣島", longitude: 132.4596, latitude: 34.3853 },
      { id: "hakone", name: "箱根", longitude: 139.1069, latitude: 35.2324 },
    ],
  },
  {
    id: "tw",
    name: "台灣",
    places: [
      { id: "taipei", name: "台北市", longitude: 121.5654, latitude: 25.033 },
      { id: "new-taipei", name: "新北市", longitude: 121.4628, latitude: 25.0143 },
      { id: "taoyuan", name: "桃園市", longitude: 121.301, latitude: 24.9936 },
      { id: "taichung", name: "台中市", longitude: 120.6736, latitude: 24.1477 },
      { id: "tainan", name: "台南市", longitude: 120.227, latitude: 22.9997 },
      { id: "kaohsiung", name: "高雄市", longitude: 120.3014, latitude: 22.6273 },
      { id: "keelung", name: "基隆市", longitude: 121.7392, latitude: 25.1276 },
      { id: "hsinchu", name: "新竹市", longitude: 120.9675, latitude: 24.8138 },
      { id: "chiayi", name: "嘉義市", longitude: 120.4491, latitude: 23.4801 },
      { id: "hsinchu-county", name: "新竹縣", longitude: 121.0043, latitude: 24.8396 },
      { id: "miaoli", name: "苗栗縣", longitude: 120.8214, latitude: 24.5602 },
      { id: "changhua", name: "彰化縣", longitude: 120.5161, latitude: 24.0518 },
      { id: "nantou", name: "南投縣", longitude: 120.6853, latitude: 23.9102 },
      { id: "yunlin", name: "雲林縣", longitude: 120.5434, latitude: 23.7092 },
      { id: "chiayi-county", name: "嘉義縣", longitude: 120.3329, latitude: 23.4592 },
      { id: "pingtung", name: "屏東縣", longitude: 120.4881, latitude: 22.6697 },
      { id: "yilan", name: "宜蘭縣", longitude: 121.753, latitude: 24.757 },
      { id: "hualien", name: "花蓮縣", longitude: 121.6015, latitude: 23.9871 },
      { id: "taitung", name: "台東縣", longitude: 121.1444, latitude: 22.7583 },
      { id: "penghu", name: "澎湖縣", longitude: 119.5664, latitude: 23.5658 },
      { id: "kinmen", name: "金門縣", longitude: 118.3171, latitude: 24.4368 },
      { id: "lienchiang", name: "連江縣", longitude: 119.9495, latitude: 26.1605 },
    ],
  },
  {
    id: "cn",
    name: "中國",
    places: [
      { id: "shanghai", name: "上海", longitude: 121.4737, latitude: 31.2304 },
      { id: "beijing", name: "北京", longitude: 116.4074, latitude: 39.9042 },
      { id: "chengdu", name: "成都", longitude: 104.0665, latitude: 30.5723 },
      { id: "zhangjiajie", name: "張家界", longitude: 110.4792, latitude: 29.327 },
      { id: "jiuzhaigou", name: "九寨溝", longitude: 103.918, latitude: 33.26 },
      { id: "jiangnan", name: "江南水鄉", longitude: 120.485, latitude: 30.745 },
    ],
  },
  {
    id: "kr",
    name: "韓國",
    places: [
      { id: "seoul", name: "首爾", longitude: 126.978, latitude: 37.5665 },
      { id: "busan", name: "釜山", longitude: 129.0756, latitude: 35.1796 },
      { id: "jeju", name: "濟州島", longitude: 126.5312, latitude: 33.4996 },
      { id: "daegu", name: "大邱", longitude: 128.6014, latitude: 35.8714 },
    ],
  },
  {
    id: "hk",
    name: "香港",
    places: [
      { id: "victoria-harbour", name: "維港", longitude: 114.173, latitude: 22.293 },
      { id: "disneyland", name: "迪士尼", longitude: 114.041, latitude: 22.313 },
      { id: "tsim-sha-tsui", name: "尖沙咀", longitude: 114.1722, latitude: 22.2976 },
      { id: "the-peak", name: "太平山夜景", longitude: 114.149, latitude: 22.2759 },
    ],
  },
  {
    id: "vn",
    name: "越南",
    places: [
      { id: "da-nang", name: "峴港", longitude: 108.2022, latitude: 16.0544 },
      { id: "phu-quoc", name: "富國島", longitude: 103.984, latitude: 10.227 },
      { id: "hanoi", name: "河內", longitude: 105.8342, latitude: 21.0278 },
      { id: "ha-long", name: "下龍灣", longitude: 107.1839, latitude: 20.9101 },
      { id: "ho-chi-minh", name: "胡志明市", longitude: 106.6297, latitude: 10.8231 },
    ],
  },
  {
    id: "th",
    name: "泰國",
    places: [
      { id: "bangkok", name: "曼谷", longitude: 100.5018, latitude: 13.7563 },
      { id: "chiang-mai", name: "清邁", longitude: 98.9817, latitude: 18.7883 },
      { id: "pattaya", name: "芭達雅", longitude: 100.8825, latitude: 12.9236 },
      { id: "phuket", name: "普吉島", longitude: 98.3923, latitude: 7.8804 },
      { id: "koh-samui", name: "蘇美島", longitude: 100.0136, latitude: 9.512 },
    ],
  },
  {
    id: "mo",
    name: "澳門",
    places: [
      { id: "cotai", name: "路氹金光大道豪華酒店度假村", longitude: 113.565, latitude: 22.1404 },
      { id: "ruins-of-st-paul", name: "大三巴牌坊", longitude: 113.5408, latitude: 22.1975 },
      { id: "portuguese-food", name: "葡式美食", longitude: 113.5396, latitude: 22.1933 },
    ],
  },
  {
    id: "us",
    name: "美國",
    places: [
      { id: "los-angeles", name: "洛杉磯", longitude: -118.2437, latitude: 34.0522 },
      { id: "san-francisco", name: "舊金山", longitude: -122.4194, latitude: 37.7749 },
      { id: "new-york", name: "紐約", longitude: -74.006, latitude: 40.7128 },
      { id: "seattle", name: "西雅圖", longitude: -122.3321, latitude: 47.6062 },
      { id: "las-vegas", name: "拉斯維加斯", longitude: -115.1398, latitude: 36.1699 },
      { id: "hawaii", name: "夏威夷", longitude: -157.8583, latitude: 21.3069 },
    ],
  },
  {
    id: "sg",
    name: "新加坡",
    places: [
      { id: "gardens-by-the-bay", name: "濱海灣花園", longitude: 103.8636, latitude: 1.2816 },
      { id: "sentosa", name: "聖淘沙", longitude: 103.8303, latitude: 1.2494 },
      { id: "universal-studios", name: "環球影城", longitude: 103.8238, latitude: 1.254 },
      { id: "chinatown", name: "牛車水", longitude: 103.8442, latitude: 1.2834 },
    ],
  },
  {
    id: "ph",
    name: "菲律賓",
    places: [
      { id: "cebu", name: "宿霧", longitude: 123.8854, latitude: 10.3157 },
      { id: "bohol", name: "薄荷島", longitude: 124.143, latitude: 9.85 },
      { id: "boracay", name: "長灘島", longitude: 121.924, latitude: 11.9674 },
      { id: "manila", name: "馬尼拉", longitude: 120.9842, latitude: 14.5995 },
      { id: "palawan", name: "巴拉望", longitude: 119.395, latitude: 11.1784 },
    ],
  },
  {
    id: "my",
    name: "馬來西亞",
    places: [
      { id: "kuala-lumpur", name: "吉隆坡", longitude: 101.6869, latitude: 3.139 },
      { id: "penang", name: "檳城", longitude: 100.3327, latitude: 5.4141 },
      { id: "sabah", name: "沙巴（亞庇）", longitude: 116.0753, latitude: 5.9804 },
      { id: "malacca", name: "馬六甲", longitude: 102.2501, latitude: 2.1896 },
    ],
  },
  {
    id: "au",
    name: "澳洲",
    places: [
      { id: "sydney", name: "雪梨", longitude: 151.2093, latitude: -33.8688 },
      { id: "melbourne", name: "墨爾本", longitude: 144.9631, latitude: -37.8136 },
      { id: "brisbane", name: "布里斯本", longitude: 153.0251, latitude: -27.4698 },
      { id: "gold-coast", name: "黃金海岸", longitude: 153.43, latitude: -28.0167 },
    ],
  },
  {
    id: "id",
    name: "印尼",
    places: [
      { id: "bali", name: "峇里島", longitude: 115.1889, latitude: -8.4095 },
      { id: "jakarta", name: "雅加達", longitude: 106.8456, latitude: -6.2088 },
      { id: "yogyakarta", name: "日惹", longitude: 110.3695, latitude: -7.7956 },
      { id: "komodo", name: "科莫多島", longitude: 119.489, latitude: -8.585 },
    ],
  },
  {
    id: "ca",
    name: "加拿大",
    places: [
      { id: "vancouver", name: "溫哥華", longitude: -123.1207, latitude: 49.2827 },
      { id: "banff", name: "班夫國家公園（洛磯山脈）", longitude: -115.5708, latitude: 51.1784 },
      { id: "toronto", name: "多倫多", longitude: -79.3832, latitude: 43.6532 },
      { id: "yellowknife", name: "黃刀鎮極光", longitude: -114.3718, latitude: 62.454 },
    ],
  },
  {
    id: "fr",
    name: "法國",
    places: [
      { id: "paris", name: "巴黎", longitude: 2.3522, latitude: 48.8566 },
      { id: "mont-saint-michel", name: "聖米歇爾山", longitude: -1.5115, latitude: 48.6361 },
      { id: "nice", name: "尼斯", longitude: 7.262, latitude: 43.7102 },
      { id: "provence", name: "普羅旺斯", longitude: 5.4474, latitude: 43.5297 },
      { id: "bordeaux", name: "波爾多", longitude: -0.5792, latitude: 44.8378 },
    ],
  },
  {
    id: "gb",
    name: "英國",
    places: [
      { id: "london", name: "倫敦", longitude: -0.1276, latitude: 51.5072 },
      { id: "edinburgh", name: "愛丁堡", longitude: -3.1883, latitude: 55.9533 },
      { id: "bath", name: "巴斯", longitude: -2.359, latitude: 51.3811 },
      { id: "oxford", name: "牛津", longitude: -1.2577, latitude: 51.752 },
      { id: "cambridge", name: "劍橋", longitude: 0.1218, latitude: 52.2053 },
      { id: "highlands", name: "蘇格蘭高地", longitude: -4.2247, latitude: 57.4778 },
    ],
  },
  {
    id: "de",
    name: "德國",
    places: [
      { id: "munich", name: "慕尼黑（黑森林／新天鵝堡）", longitude: 11.582, latitude: 48.1351 },
      { id: "frankfurt", name: "法蘭克福", longitude: 8.6821, latitude: 50.1109 },
      { id: "berlin", name: "柏林", longitude: 13.405, latitude: 52.52 },
      { id: "romantic-road", name: "羅曼蒂克大道", longitude: 10.1784, latitude: 49.3772 },
    ],
  },
  {
    id: "it",
    name: "義大利",
    places: [
      { id: "rome", name: "羅馬", longitude: 12.4964, latitude: 41.9028 },
      { id: "florence", name: "佛羅倫斯", longitude: 11.2558, latitude: 43.7696 },
      { id: "venice", name: "威尼斯", longitude: 12.3155, latitude: 45.4408 },
      { id: "milan", name: "米蘭", longitude: 9.19, latitude: 45.4642 },
      { id: "amalfi", name: "阿瑪菲海岸", longitude: 14.6026, latitude: 40.634 },
    ],
  },
  {
    id: "ch",
    name: "瑞士",
    places: [
      { id: "zermatt", name: "策馬特（馬特洪峰）", longitude: 7.7491, latitude: 46.0207 },
      { id: "jungfrau", name: "少女峰地區", longitude: 8.034, latitude: 46.624 },
      { id: "interlaken", name: "茵特拉肯", longitude: 7.8632, latitude: 46.6863 },
      { id: "lucerne", name: "琉森", longitude: 8.3093, latitude: 47.0502 },
    ],
  },
  {
    id: "nz",
    name: "紐西蘭",
    places: [
      { id: "queenstown", name: "皇后鎮", longitude: 168.6626, latitude: -45.0312 },
      { id: "christchurch", name: "基督城", longitude: 172.6362, latitude: -43.5321 },
      { id: "auckland", name: "奧克蘭", longitude: 174.7633, latitude: -36.8485 },
      { id: "rotorua", name: "羅托路亞（南北島自駕）", longitude: 176.2497, latitude: -38.1368 },
    ],
  },
  {
    id: "es",
    name: "西班牙",
    places: [
      { id: "barcelona", name: "巴塞隆納（高第建築）", longitude: 2.1734, latitude: 41.3851 },
      { id: "madrid", name: "馬德里", longitude: -3.7038, latitude: 40.4168 },
      { id: "seville", name: "塞維亞", longitude: -5.9845, latitude: 37.3891 },
      { id: "granada", name: "格拉納達", longitude: -3.5986, latitude: 37.1773 },
    ],
  },
  {
    id: "at",
    name: "奧地利",
    places: [
      { id: "vienna", name: "維也納", longitude: 16.3738, latitude: 48.2082 },
      { id: "salzburg", name: "薩爾斯堡", longitude: 13.055, latitude: 47.8095 },
      { id: "hallstatt", name: "哈修塔特（常與捷匈連玩）", longitude: 13.6493, latitude: 47.5622 },
    ],
  },
  {
    id: "cz",
    name: "捷克",
    places: [
      { id: "prague", name: "布拉格", longitude: 14.4378, latitude: 50.0755 },
      { id: "cesky-krumlov", name: "庫倫洛夫（CK童話小鎮）", longitude: 14.3152, latitude: 48.8127 },
      { id: "karlovy-vary", name: "卡羅維瓦利", longitude: 12.8712, latitude: 50.2319 },
    ],
  },
  {
    id: "ae",
    name: "阿拉伯聯合大公國",
    places: [
      { id: "dubai", name: "杜拜（哈里發塔、沙漠飆沙）", longitude: 55.2708, latitude: 25.2048 },
      { id: "abu-dhabi", name: "阿布達比（羅浮宮、大清真寺）", longitude: 54.3773, latitude: 24.4539 },
    ],
  },
  {
    id: "nl",
    name: "荷蘭",
    places: [
      { id: "amsterdam", name: "阿姆斯特丹", longitude: 4.9041, latitude: 52.3676 },
      { id: "keukenhof", name: "庫肯霍夫鬱金香花園", longitude: 4.5463, latitude: 52.2715 },
      { id: "giethoorn", name: "羊角村", longitude: 6.077, latitude: 52.74 },
      { id: "rotterdam", name: "鹿特丹", longitude: 4.4777, latitude: 51.9244 },
    ],
  },
  {
    id: "tr",
    name: "土耳其",
    places: [
      { id: "istanbul", name: "伊斯坦堡", longitude: 28.9784, latitude: 41.0082 },
      { id: "cappadocia", name: "卡帕多奇亞熱氣球", longitude: 34.829, latitude: 38.6431 },
      { id: "pamukkale", name: "棉花堡", longitude: 29.1187, latitude: 37.9137 },
      { id: "ephesus", name: "以弗所", longitude: 27.3639, latitude: 37.9492 },
    ],
  },
  {
    id: "gu",
    name: "關島（美國領地）",
    places: [
      { id: "tumon", name: "杜夢灣", longitude: 144.798, latitude: 13.515 },
      { id: "duty-free", name: "免稅購物", longitude: 144.801, latitude: 13.51 },
      { id: "water-activities", name: "浮潛與跳傘水上活動", longitude: 144.79, latitude: 13.5 },
    ],
  },
  {
    id: "is",
    name: "冰島",
    places: [
      { id: "reykjavik", name: "雷克雅維克", longitude: -21.9426, latitude: 64.1466 },
      { id: "golden-circle", name: "黃金圈", longitude: -21.129, latitude: 64.255 },
      { id: "blue-lagoon", name: "藍湖溫泉", longitude: -22.4495, latitude: 63.8804 },
      { id: "black-sand", name: "黑沙灘", longitude: -19.071, latitude: 63.404 },
      { id: "aurora", name: "追極光", longitude: -21.9, latitude: 64.25 },
    ],
  },
  {
    id: "be",
    name: "比利時",
    places: [
      { id: "brussels", name: "布魯塞爾", longitude: 4.3517, latitude: 50.8503 },
      { id: "bruges", name: "布魯日", longitude: 3.2247, latitude: 51.2093 },
      { id: "ghent", name: "根特（常與荷法跨國同遊）", longitude: 3.7174, latitude: 51.0543 },
    ],
  },
  {
    id: "eg",
    name: "埃及",
    places: [
      { id: "cairo", name: "開羅（金字塔）", longitude: 31.2357, latitude: 30.0444 },
      { id: "luxor", name: "路克索", longitude: 32.6396, latitude: 25.6872 },
      { id: "nile-cruise", name: "尼羅河遊輪", longitude: 32.8998, latitude: 24.0889 },
      { id: "abu-simbel", name: "阿布辛貝神殿", longitude: 31.6258, latitude: 22.3372 },
    ],
  },
];

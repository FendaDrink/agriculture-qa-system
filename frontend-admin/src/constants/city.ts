export const CITY_OPTIONS: Array<{ label: string; value: number }> = [
  { label: '湖北省（公共）', value: 0 },
  { label: '武汉市', value: 1 },
  { label: '黄石市', value: 2 },
  { label: '十堰市', value: 3 },
  { label: '宜昌市', value: 4 },
  { label: '襄阳市', value: 5 },
  { label: '鄂州市', value: 6 },
  { label: '荆门市', value: 7 },
  { label: '孝感市', value: 8 },
  { label: '荆州市', value: 9 },
  { label: '黄冈市', value: 10 },
  { label: '咸宁市', value: 11 },
  { label: '随州市', value: 12 },
  { label: '恩施土家族苗族自治州', value: 13 },
  { label: '仙桃市', value: 14 },
  { label: '潜江市', value: 15 },
  { label: '天门市', value: 16 },
  { label: '神农架林区', value: 17 },
]

const CITY_LABEL_MAP: Record<number, string> = CITY_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {} as Record<number, string>)

export const getCityLabel = (city?: number | string | null): string => {
  if (city === null || city === undefined || city === '') return '-'
  const code = Number(city)
  if (Number.isInteger(code) && CITY_LABEL_MAP[code]) return CITY_LABEL_MAP[code]

  if (typeof city === 'string') {
    const hit = CITY_OPTIONS.find((item) => city.includes(item.label.replace(/(自治州|市|林区|（公共）)$/u, '')))
    if (hit) return hit.label
    if (city.includes('湖北')) return CITY_LABEL_MAP[0]
  }
  return '-'
}


export const HUBEI_CITY_OPTIONS: Array<{ code: number; name: string }> = [
  { code: 1, name: '武汉市' },
  { code: 2, name: '黄石市' },
  { code: 3, name: '十堰市' },
  { code: 4, name: '宜昌市' },
  { code: 5, name: '襄阳市' },
  { code: 6, name: '鄂州市' },
  { code: 7, name: '荆门市' },
  { code: 8, name: '孝感市' },
  { code: 9, name: '荆州市' },
  { code: 10, name: '黄冈市' },
  { code: 11, name: '咸宁市' },
  { code: 12, name: '随州市' },
  { code: 13, name: '恩施土家族苗族自治州' },
  { code: 14, name: '仙桃市' },
  { code: 15, name: '潜江市' },
  { code: 16, name: '天门市' },
  { code: 17, name: '神农架林区' },
]

const CITY_CODE_NAME_MAP: Record<number, string> = HUBEI_CITY_OPTIONS.reduce((acc, item) => {
  acc[item.code] = item.name
  return acc
}, {} as Record<number, string>)

export const getCityNameByCode = (city?: number | string | null) => {
  if (city === null || city === undefined || city === '') return '-'
  const code = Number(city)
  if (code === 0) return '湖北省'
  if (CITY_CODE_NAME_MAP[code]) return CITY_CODE_NAME_MAP[code]
  if (typeof city === 'string') {
    const hit = HUBEI_CITY_OPTIONS.find((item) => city.includes(item.name.replace(/(自治州|市|林区)$/u, '')))
    if (hit) return hit.name
    if (city.includes('湖北')) return '湖北省'
  }
  return '-'
}

export enum HubeiCityCode {
  HUBEI_PROVINCE = 0,
  WUHAN = 1,
  HUANGSHI = 2,
  SHIYAN = 3,
  YICHANG = 4,
  XIANGYANG = 5,
  EZHOU = 6,
  JINGMEN = 7,
  XIAOGAN = 8,
  JINGZHOU = 9,
  HUANGGANG = 10,
  XIANNING = 11,
  SUIZHOU = 12,
  ENSHI = 13,
  XIANTAO = 14,
  QIANJIANG = 15,
  TIANMEN = 16,
  SHENNONGJIA = 17,
}

export const HUBEI_CITY_CODE_NAME_MAP: Record<number, string> = {
  [HubeiCityCode.HUBEI_PROVINCE]: '湖北省',
  [HubeiCityCode.WUHAN]: '武汉市',
  [HubeiCityCode.HUANGSHI]: '黄石市',
  [HubeiCityCode.SHIYAN]: '十堰市',
  [HubeiCityCode.YICHANG]: '宜昌市',
  [HubeiCityCode.XIANGYANG]: '襄阳市',
  [HubeiCityCode.EZHOU]: '鄂州市',
  [HubeiCityCode.JINGMEN]: '荆门市',
  [HubeiCityCode.XIAOGAN]: '孝感市',
  [HubeiCityCode.JINGZHOU]: '荆州市',
  [HubeiCityCode.HUANGGANG]: '黄冈市',
  [HubeiCityCode.XIANNING]: '咸宁市',
  [HubeiCityCode.SUIZHOU]: '随州市',
  [HubeiCityCode.ENSHI]: '恩施土家族苗族自治州',
  [HubeiCityCode.XIANTAO]: '仙桃市',
  [HubeiCityCode.QIANJIANG]: '潜江市',
  [HubeiCityCode.TIANMEN]: '天门市',
  [HubeiCityCode.SHENNONGJIA]: '神农架林区',
}

const normalizeAlias = (value: string): string => value.trim().replace(/\s+/g, '')

const buildAliasMap = () => {
  const aliasMap = new Map<string, number>()
  Object.entries(HUBEI_CITY_CODE_NAME_MAP).forEach(([rawCode, name]) => {
    const code = Number(rawCode)
    aliasMap.set(normalizeAlias(name), code)
    aliasMap.set(normalizeAlias(name.replace(/(自治州|市|州|林区)$/u, '')), code)
    if (name.includes('恩施')) {
      aliasMap.set('恩施', code)
      aliasMap.set('恩施州', code)
    }
  })
  aliasMap.set('湖北', HubeiCityCode.HUBEI_PROVINCE)
  aliasMap.set('湖北省', HubeiCityCode.HUBEI_PROVINCE)
  return aliasMap
}

const CITY_ALIAS_CODE_MAP = buildAliasMap()

export const HUBEI_CITY_NAME_LIST = Object.entries(HUBEI_CITY_CODE_NAME_MAP)
  .filter(([rawCode]) => Number(rawCode) !== HubeiCityCode.HUBEI_PROVINCE)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .map(([, name]) => name)

export const normalizeCityNameText = (value?: string | number): string =>
  String(value || '').trim().replace(/\s+/g, '').replace(/(自治州|市|州|林区|区|县)$/u, '')

export const cityNameToCode = (
  value?: string | number | null,
  fallback = HubeiCityCode.WUHAN,
): number => {
  if (value === null || value === undefined || value === '') return fallback
  const num = Number(value)
  if (Number.isInteger(num) && HUBEI_CITY_CODE_NAME_MAP[num]) return num
  const alias = normalizeAlias(String(value))
  return CITY_ALIAS_CODE_MAP.get(alias) ?? fallback
}

export const cityCodeToName = (
  value?: string | number | null,
  fallback = '',
): string => {
  if (value === null || value === undefined || value === '') return fallback
  const num = Number(value)
  if (Number.isInteger(num) && HUBEI_CITY_CODE_NAME_MAP[num]) return HUBEI_CITY_CODE_NAME_MAP[num]
  const alias = normalizeAlias(String(value))
  const code = CITY_ALIAS_CODE_MAP.get(alias)
  if (code !== undefined) return HUBEI_CITY_CODE_NAME_MAP[code]
  return fallback || String(value)
}

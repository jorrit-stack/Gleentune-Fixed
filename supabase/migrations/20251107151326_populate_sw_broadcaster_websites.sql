/*
  # Populate shortwave broadcaster official websites

  1. Purpose
    - Add source_url (official websites) for major shortwave broadcasters
    - Users will be redirected to these sites for restricted stations
    - Covers BBC, NHK, Radio Taiwan, Deutsche Welle, and other major services

  2. Broadcaster Websites
    - BBC World Service: https://www.bbc.co.uk/sounds/play/live:bbc_world_service
    - NHK World: https://www3.nhk.or.jp/nhkworld/en/live/
    - Radio Taiwan International: https://en.rti.org.tw/
    - Deutsche Welle: https://www.dw.com/en/media-center/live-tv/s-100817
    - Voice of America: https://www.voanews.com/
    - Radio New Zealand: https://www.rnz.co.nz/national
    - Radio France Internationale: https://www.rfi.fr/en/
*/

-- BBC World Service
UPDATE shortwave_stations
SET source_url = 'https://www.bbc.co.uk/sounds/play/live:bbc_world_service'
WHERE (station_name ILIKE '%BBC%' OR station_name ILIKE '%World Service%')
  AND source_url IS NULL;

-- NHK World Radio Japan
UPDATE shortwave_stations
SET source_url = 'https://www3.nhk.or.jp/nhkworld/en/live/'
WHERE station_name ILIKE '%NHK%'
  AND source_url IS NULL;

-- Radio Taiwan International
UPDATE shortwave_stations
SET source_url = 'https://en.rti.org.tw/'
WHERE (station_name ILIKE '%Taiwan%' OR station_name ILIKE '%RTI%')
  AND source_url IS NULL;

-- Deutsche Welle
UPDATE shortwave_stations
SET source_url = 'https://www.dw.com/en/media-center/live-tv/s-100817'
WHERE (station_name ILIKE '%Deutsche%' OR station_name ILIKE '%Welle%' OR station_name = 'de')
  AND source_url IS NULL;

-- Voice of America
UPDATE shortwave_stations
SET source_url = 'https://www.voanews.com/'
WHERE station_name ILIKE '%VOA%'
  AND source_url IS NULL;

-- Radio New Zealand International
UPDATE shortwave_stations
SET source_url = 'https://www.rnz.co.nz/national'
WHERE (station_name ILIKE '%RNZ%' OR station_name ILIKE '%New Zealand%')
  AND source_url IS NULL;

-- Radio France Internationale  
UPDATE shortwave_stations
SET source_url = 'https://www.rfi.fr/en/'
WHERE (station_name ILIKE '%RFI%' OR station_name ILIKE '%France%')
  AND source_url IS NULL;

-- Voice of Korea (North Korea)
UPDATE shortwave_stations
SET source_url = 'https://www.vok.rep.kp/en/'
WHERE station_name ILIKE '%Korea%'
  AND source_url IS NULL;

-- China Radio International
UPDATE shortwave_stations
SET source_url = 'https://english.cri.cn/'
WHERE (station_name ILIKE '%China%' OR station_name ILIKE '%CRI%')
  AND source_url IS NULL;

-- All India Radio
UPDATE shortwave_stations
SET source_url = 'https://newsonair.gov.in/'
WHERE (station_name ILIKE '%India%' OR station_name ILIKE '%AIR%')
  AND source_url IS NULL;

-- WINB World International Broadcasters
UPDATE shortwave_stations
SET source_url = 'https://winb.com/'
WHERE station_name ILIKE '%WINB%'
  AND source_url IS NULL;

-- Radio Shiokaze
UPDATE shortwave_stations
SET source_url = 'http://www.chosa-kai.jp/english/'
WHERE station_name ILIKE '%Shiokaze%'
  AND source_url IS NULL;

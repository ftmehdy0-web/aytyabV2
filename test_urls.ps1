$urls = @(
  "http://127.0.0.1:8080/index.html",
  "http://127.0.0.1:8080/css/style.css",
  "http://127.0.0.1:8080/js/products.js",
  "http://127.0.0.1:8080/js/app.js",
  "http://127.0.0.1:8080/assets/images/hero_slide_1.jpg",
  "http://127.0.0.1:8080/assets/images/hero_slide_2.jpg",
  "http://127.0.0.1:8080/assets/images/hero_slide_3.jpg",
  "http://127.0.0.1:8080/assets/images/a555.jpg",
  "http://127.0.0.1:8080/assets/images/nader.jpg",
  "http://127.0.0.1:8080/assets/images/backhoor.jpg",
  "http://127.0.0.1:8080/assets/images/mashair.jpg",
  "http://127.0.0.1:8080/assets/images/moon_flower.jpg",
  "http://127.0.0.1:8080/assets/images/tiger_oud.jpg"
)

foreach ($url in $urls) {
    try {
        $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        Write-Host "$url -> $($res.StatusCode) OK ($($res.RawContentLength) bytes)"
    } catch {
        Write-Host "$url -> FAILED: $_"
    }
}

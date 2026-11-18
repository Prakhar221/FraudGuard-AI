import requests
import json

def download_lottie(url, filename):
    response = requests.get(url)
    if response.status_code == 200:
        with open(filename, 'w') as f:
            json.dump(response.json(), f)
        print(f"Downloaded {filename}")
    else:
        print(f"Failed to download {filename}")

# Security Shield Animation (Using Scan Animation as per user request)
download_lottie("https://assets8.lottiefiles.com/packages/lf20_qp1q7mct.json", "shield.json")
# Scanning Animation
download_lottie("https://assets8.lottiefiles.com/packages/lf20_qp1q7mct.json", "scan.json")

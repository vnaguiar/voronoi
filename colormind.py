from selenium import webdriver

driver = webdriver.Chrome()
driver.get("http://colormind.io")

palette = set()

while (len(palette) < 42):
	mix = []
	html = driver.find_elements_by_class_name("color")
	
	for color in html[0:5]:
		mix.append(color.get_attribute("data-color").encode("utf-8"))
	
	palette.add(tuple(sorted(mix)))
	driver.refresh()

driver.close()

data = [list(elem) for elem in palette]
data = "palette = " + str(data)

with open('data.js', 'w') as f:
	f.write(data)


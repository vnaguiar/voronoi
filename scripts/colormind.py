from selenium import webdriver

palette = set()
driver = webdriver.Chrome()
driver.get("http://colormind.io")

while (len(palette) < 42):
	html = driver.find_elements_by_class_name("color")
	
	for i in range(0,5):
		colors = []
		for j in range(5*i, 5*(i+1)):
			colors.append(html[j].get_attribute("data-color").encode("utf-8"))
		palette.add(tuple(sorted(colors)))
	
	driver.refresh()
	
driver.close()

data = [list(elem) for elem in palette]
data = "palette = " + str(data)

with open('palette.js', 'w') as f:
	f.write(data)


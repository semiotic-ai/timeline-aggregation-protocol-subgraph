import sys
info = sys.argv[1]
start_pos = info.find("GraphToken has been deployed to address: ")
start_pos = start_pos + len("GraphToken has been deployed to address: ")
data = info[start_pos: start_pos +42]
print(data)
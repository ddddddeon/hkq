import socket
import time

i = 0
while(True):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    host = ("fuckup", 9090)
    sock.connect(host)
    print "ENQ kalli hi im great lol number " + str(i)
    sock.sendall("ENQ kalli hi im great lol number " + str(i))
#    sock.sendall("DEQ kalli")
    sock.close()
    i += 1
    time.sleep(0.01)

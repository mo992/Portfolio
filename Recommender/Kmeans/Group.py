import copy
import numpy as np

class Group:

  def __init__(self, group_name, center):
    self.group_name = "第%s群" % group_name
    self.center = center
    self.old_center = []
    self.points = []    

  def getNewCenter(self):
    self.old_center = copy.deepcopy(self.center)
    self.center = list(np.sum(self.points, axis=0)/len(self.points))

  def CalculateED(self, distFunc):
    centersED = []
    centersED.append(distFunc(self.center, self.old_center))
    return centersED

  def SSE(self, point):
    dist = 0
    for index in range(len(point)):
      dist += (point[index]-self.center[index])**2
    return dist

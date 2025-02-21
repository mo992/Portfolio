import enum
import numpy as np

#列舉距離函數
class distEnum(enum.Enum):
  cos = 0
  EuclideanDistance = 1

# 距離函數
class distance:

  def __init__(self, distFunctionName):
    self.distFunctionName = distFunctionName 

  def cosFunc(self, sample, center):
    if all(v == 0 for v in sample) or all(v == 0 for v in center):
      raise ZeroDivisionError
    else:
      return 1 - np.dot(sample, center)/(np.dot(sample, sample)**(1/2)*np.dot(center, center)**(1/2))

  def EuclideanDistance(self, sample, center):
    # 計算歐氏距離
    dist = 0
    for index in range(len(sample)):
      dist += (sample[index] - center[index])**2
    return np.sqrt(dist)

  # 挑選距離函數
  def getDistFunc(self):
    distDict = {distEnum.cos: self.cosFunc,
                distEnum.EuclideanDistance: self.EuclideanDistance}
    defDistFunc = distDict[self.distFunctionName]
    return defDistFunc

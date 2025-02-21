import enum
import numpy as np
import random

class centerSelectEnum(enum.Enum):
  random = 0
  kmeansPlusPlus = 1

class selectCenter:

  def __init__(self, selectFunctionName):
    self.selectFunctionName = selectFunctionName

  def getCenterByRandom(self, training_samples, group_count):
    print("使用隨機亂數挑選群心")
    choose_index = np.random.choice(len(training_samples), group_count, replace = False)
    centers = [training_samples[i] for i in range(len(training_samples)) if i in choose_index]
    return centers

  def kmeansPlusPlus(self, training_samples, group_count):
    print("使用K-means++挑選群心")
    def distSC(x, mu):
      total=0
      for index in range(len(x)):
        total += (x[index] - mu[index])**2
      return total**(1/2)
    choose_index = np.random.choice(len(training_samples), 1, replace = False)
    centers = [training_samples[choose_index[0]]]
    print("first center:{}".format(centers))
    def getNewCenter(centers, selectedSet):
      print("="*30)
      def nearestDist(sample, centers):
        minDist = float("inf")
        for center in centers:
          dist = distSC(sample, center)
          if dist < minDist:
            minDist = dist
        return minDist
      s = 0
      d = []
      for index in range(len(selectedSet)):
        di = nearestDist(selectedSet[index], centers)
        s += di
        if di != 0:
          d.append(di)
      s *= 1 - random.random()
      print("distance:{}".format(d))
      print("Samples:{}".format(selectedSet))
      randomOrder = np.random.choice(len(d), len(d), replace=False)
      randD = [d[i] for i in randomOrder]
      print("random distance:{}".format(randD))
      randSampleForNewCenter = [selectedSet[i] for i in randomOrder]
      print("random samples:{}".format(randSampleForNewCenter))
      for di, dist in enumerate(randD):
        s -= dist
        last_index = di
        print("s = %f, last index %d" % (s, last_index)) 
        if s<=0:
          break
      print("="*30)
      return randSampleForNewCenter[last_index], [sample for index, sample in enumerate(randSampleForNewCenter) if index != last_index]
    selectedSet = [sample for index, sample in enumerate(training_samples) if index not in choose_index]
    for t in range(group_count-1):
      getNewC = getNewCenter(centers, selectedSet)
      centers.append(getNewC[0])
      selectedSet =  getNewC[1]
      print("第{}個群心是{}".format(t+2, getNewC[0]))
    return centers

  def getSelectFunc(self):
    selectDict = {centerSelectEnum.random: self.getCenterByRandom,
                  centerSelectEnum.kmeansPlusPlus: self.kmeansPlusPlus}
    defSelectFunc = selectDict[self.selectFunctionName]
    return defSelectFunc
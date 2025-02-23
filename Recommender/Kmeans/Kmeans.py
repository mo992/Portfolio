import numpy as np
import dist
import selectCenters
import Group

class KMeans:

  def __init__(self, training_samples, distFunctionName=dist.distEnum.EuclideanDistance, initCenterSelectMethod = selectCenters.centerSelectEnum.random, group_count=2, convergence=0.001, max_epoch = 100):
    self.training_samples = training_samples
    self.convergence = convergence           
    self.max_epoch = max_epoch              
    self.group_count = group_count          
    self.groups = []                        
    self.distFunc = dist.distance(distFunctionName)
    self.initCenterSelectMethod = selectCenters.selectCenter(initCenterSelectMethod)

  def change_training_sample(self, *args):
    self.training_samples = list(args)

  def grouping(self, centers, predicted_samples = [], training = True):
    if training == True:
      self.groups = [Group.Group(group_name = chr(i+65), center = centers[i]) for i in range(self.group_count)]
      samples = self.training_samples
    else:
      samples = predicted_samples
      print(f"新樣本為: {samples}\n預測結果為")
    for index, sample in enumerate(samples):
      min_distance = float("inf")
      group_index = -1
      for index, center in enumerate(centers):
        distance = self.distFunc.getDistFunc()(sample, center)
        if distance < min_distance:
          min_distance = distance
          group_index = index
      if training == True:
        self.groups[group_index].points.append(sample)
      else:
        print("Sample " + str(sample) + " belong to " + self.groups[group_index].group_name)

  def Training(self):
    
    print("訓練樣本為" + str(self.training_samples))
    print("======開始訓練======")
    times = 0
    
    centers = self.initCenterSelectMethod.getSelectFunc()(training_samples = self.training_samples, group_count = self.group_count)
    self.grouping(centers = centers, training = True)    
    while True:

      times += 1
      centersED = []
      for group in self.groups:
        group.getNewCenter()
        centersED.append(group.CalculateED(distFunc = self.distFunc.getDistFunc()))
      
      if (np.mean(centersED) < self.convergence) or (times >= self.max_epoch):
        SSE = 0
        for group in self.groups:
          print("樣本{}, 屬於{}".format(group.points, group.group_name) )
          for point in group.points:
            SSE += group.SSE(point)
        print("======訓練結束======\n" + "SSE:" + str(SSE) + "\n")
        break

  def prediction(self, samples):
    self.grouping([group.center for group in self.groups], predicted_samples = samples, training = False)
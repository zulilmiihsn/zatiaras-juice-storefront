import runpy
code = runpy.run_path('scratch/google-openlocationcode.py')
full = code['recoverNearest']('G4FP+GX5', -0.5021, 117.1536)
area = code['decode'](full)
print(full, area.latitudeCenter, area.longitudeCenter)

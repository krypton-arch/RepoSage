from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import GlobalSettings
from .serializers import GlobalSettingsSerializer

@api_view(['GET', 'PATCH'])
def global_settings(request):
    """GET or PATCH global system settings."""
    settings = GlobalSettings.load()
    
    if request.method == 'GET':
        serializer = GlobalSettingsSerializer(settings)
        return Response(serializer.data)
        
    elif request.method == 'PATCH':
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

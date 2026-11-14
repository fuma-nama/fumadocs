require 'net/http'

uri = URI('http://localhost:8080/hello_world?search=ai')
request = Net::HTTP::Post.new(uri)
request['authorization'] = 'Bearer'
request['if-none-match'] = '"etag"'
request['Cookie'] = 'mode=light'
request.set_form([
  ['name', 'Mars'],
  ['image', '@mars.jpg'],
], 'multipart/form-data')

response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https') do |http|
  http.request(request)
end

puts response.body